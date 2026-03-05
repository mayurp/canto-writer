export class CharacterData {
  private decompositionMap = new Map<string, string>()
  private matchMap = new Map<string, number[][]>()
  private rthList: string[] = []
  private componentKeywords = new Map<string, string>()
  private characterKeywords = new Map<string, string>()
  private componentColors = new Map<string, string>() // Map<component, hexColor>

  public parse(
    jsonlContent: string,
    rthContent: string,
    componentKeywordsContent: string,
    characterKeywordsContent: string,
    componentColors: {
      groups: Record<string, { color: string; components?: string[] }>
    } | null,
  ) {
    const rthList: { char: string; rthIndex: number }[] = []
    if (rthContent) {
      const lines = rthContent.split('\n')
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const parts = line.split(',')
        // Column 1 is "RTH #", Column 2 is "TH" (Character) - wait, let's re-verify column indices from the CSV view
        // CSV Header: Opt RTH,RTH #,TH,...
        // So parts[0] is Opt RTH, parts[1] is RTH #, parts[2] is Character (TH)
        const rthIndex = parseFloat(parts[1])
        const char = parts[2]
        if (char && !isNaN(rthIndex)) {
          rthList.push({ char, rthIndex })
        }
      }
    }

    // Sort by RTH Index
    rthList.sort((a, b) => a.rthIndex - b.rthIndex)
    this.rthList = rthList.map((item) => item.char)

    // Parse main dictionary
    const parseJsonl = (content: string) => {
      const lines = content.split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.character) {
            if (data.decomposition) {
              this.decompositionMap.set(data.character, data.decomposition)
            }
            if (data.matches) {
              this.matchMap.set(data.character, data.matches)
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    parseJsonl(jsonlContent)

    // Parse keywords
    const parseKeywords = (content: string, map: Map<string, string>) => {
      const lines = content.split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.character && data.keyword) {
            map.set(data.character, data.keyword)
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (componentKeywordsContent) {
      const lines = componentKeywordsContent.split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.character && data.keyword) {
            if (data.character === '[IMG]') {
              // Map [keyword] -> keyword
              this.componentKeywords.set(`[${data.keyword}]`, data.keyword)
            } else {
              this.componentKeywords.set(data.character, data.keyword)
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (characterKeywordsContent) {
      parseKeywords(characterKeywordsContent, this.characterKeywords)
    }

    // Parse component colors
    if (componentColors) {
      try {
        const groups = componentColors.groups || {}
        for (const groupName in groups) {
          const group = groups[groupName]
          const color = group.color
          const components = group.components || []
          for (const comp of components) {
            this.componentColors.set(comp, color)
          }
        }
      } catch (e) {
        console.warn('Failed to parse component colors', e)
      }
    }

    console.log(
      `Loaded ${this.rthList.length} RTH characters. First 10:`,
      this.rthList.slice(0, 10),
    )
  }

  public getComponentPath(
    character: string,
    strokeIndex: number,
  ): number[] | undefined {
    const matches = this.matchMap.get(character)
    if (!matches) return undefined

    // We intentionally return the reference to the array here as it's used as a key
    // or we can return a copy if safety is preferred. A copy is safer.
    const indices = matches[strokeIndex]
    return indices ? [...indices] : undefined
  }

  public getComponent(
    character: string,
    strokeIndex: number,
  ): string | undefined {
    const matches = this.matchMap.get(character)
    if (!matches) return undefined

    const componentIndices = matches[strokeIndex]
    if (!componentIndices || componentIndices.length === 0) return undefined

    // Attempt to resolve index to the actual component string from decomposition
    const decomp = this.decompositionMap.get(character)
    if (!decomp) return character // Return character itself if no decomposition (atomic)

    if (typeof decomp === 'string') {
      const resolved = this.resolveIdsPath(decomp, componentIndices)
      if (resolved) {
        const code = resolved.codePointAt(0) || 0
        // Only return if it's not a structural character
        if (code < 0x2ff0 || code > 0x2ffb) {
          return resolved
        }
      }
    }

    // Fallback/Legacy: matches often contain a path from root to leaf
    // If decomp is an array, we try to pick the most specific valid component.
    const decompArray = Array.isArray(decomp) ? decomp : []
    for (let i = componentIndices.length - 1; i >= 0; i--) {
      const index = componentIndices[i]
      const comp = decompArray[index]
      if (comp) {
        const code = comp.codePointAt(0) || 0
        // Skip IDS structural characters (U+2FF0 to U+2FFB)
        if (code < 0x2ff0 || code > 0x2ffb) {
          return comp
        }
      }
    }

    // Ultimate fallback to index string
    return `idx-${componentIndices[0]}`
  }

  /**
   * Tokenizes an IDS string into atomic tokens, treating [...] bracketed
   * components as single tokens (e.g. "[goggles]" is one token, not 9 chars).
   */
  private tokenizeIds(ids: string): string[] {
    const tokens: string[] = []
    const chars = Array.from(ids)
    let i = 0
    while (i < chars.length) {
      if (chars[i] === '[') {
        // Collect everything up to and including the closing ']'
        let end = i + 1
        while (end < chars.length && chars[end] !== ']') end++
        tokens.push(chars.slice(i, end + 1).join(''))
        i = end + 1
      } else {
        tokens.push(chars[i])
        i++
      }
    }
    return tokens
  }

  /**
   * Resolves a path in an IDS (Ideographic Description Sequence) string.
   * Path indices refer to sibling positions at each node.
   * Supports bracketed tokens like [goggles] as single atomic nodes.
   */
  private resolveIdsPath(ids: string, path: number[]): string | undefined {
    const tokens = this.tokenizeIds(ids)
    let offset = 0

    const skip = () => {
      if (offset >= tokens.length) return
      const token = tokens[offset++]
      const code = token.codePointAt(0) || 0
      if (code >= 0x2ff0 && code <= 0x2ffb) {
        // Operator: arity is 3 for ⿲ and ⿳, else 2
        const arity = code === 0x2ff2 || code === 0x2ff3 ? 3 : 2
        for (let i = 0; i < arity; i++) {
          skip()
        }
      }
    }

    for (let i = 0; i < path.length; i++) {
      if (offset >= tokens.length) return undefined
      const token = tokens[offset++]
      const code = token.codePointAt(0) || 0

      if (code >= 0x2ff0 && code <= 0x2ffb) {
        const childIdx = path[i]
        // Skip siblings before the target child
        for (let j = 0; j < childIdx; j++) {
          skip()
        }
        // Next iteration will process the target child at the new offset
      } else {
        // Reached a leaf before the path ended? Return the leaf.
        return token
      }
    }

    return offset < tokens.length ? tokens[offset] : undefined
  }

  public getSemanticColor(componentKey: string): string | undefined {
    return this.componentColors.get(componentKey)
  }

  public assignColors(components: string[]): string[] {
    const baseColors = components.map((comp) => {
      const isSemantic = !!this.getSemanticColor(comp)
      const [h, s, l] = this.getBaseColorHSL(comp)
      return { h, s, l, isSemantic }
    })

    const result: string[] = new Array(components.length)

    // Tracks (hue, isSemantic) for every color already committed.
    // Used so hash components can dodge both anchors and each other.
    const usedHues: { h: number; isSemantic: boolean }[] = []

    // ---- helpers --------------------------------------------------------

    const hueDist = (a: number, b: number) => {
      const d = Math.abs(a - b)
      return Math.min(d, 360 - d)
    }

    // Hue that results after applySemanticVariation (small nudge)
    const semanticVariedHue = (baseH: number, collisions: number): number => {
      if (collisions === 0) return baseH
      const sign = collisions % 2 === 0 ? 1 : -1
      const magnitude = Math.ceil(collisions / 2)
      return (baseH + sign * 30 * magnitude + 360) % 360
    }

    // Hue that results after applyHashVariation (aggressive jump)
    const hashVariedHue = (baseH: number, collisions: number): number => {
      if (collisions === 0) return baseH
      const sign = collisions % 2 === 0 ? 1 : -1
      const magnitude = Math.ceil(collisions / 2)
      return (baseH + sign * 120 * magnitude + 360) % 360
    }

    // Count existing used hues within `threshold` degrees of h
    // For hashes, we want to dodge everything aggressively (both semantic and non-semantic)
    // For semantics, we only care about dodging other semantics (to preserve theme color as much as possible)
    const countCollisions = (
      h: number,
      forSemantic: boolean,
      threshold = 45,
    ): number => {
      let count = 0
      for (const used of usedHues) {
        // If we are placing a semantic color, we only count collisions against other semantic colors.
        if (forSemantic && !used.isSemantic) continue

        if (hueDist(h, used.h) < threshold) count++
      }
      return count
    }

    // ---- Pass 1: semantic anchors ---------------------------------------
    // Semantic components are assigned first so their theme colors act as
    // anchors that hash-based components must move around.
    // If two semantic components are too close, the later one gets a small
    // hue nudge (≤30° per step) rather than a destructive 120° rotation.
    components.forEach((_, i) => {
      const base = baseColors[i]
      if (!base.isSemantic) return

      const collisions = countCollisions(base.h, true)
      result[i] = this.applySemanticVariation(
        base.h,
        base.s,
        base.l,
        collisions,
      )
      usedHues.push({
        h: semanticVariedHue(base.h, collisions),
        isSemantic: true,
      })
    })

    // ---- Pass 2: hash-based components ----------------------------------
    // These must avoid all semantic anchors AND each other.
    // Use aggressive 120° hue jumps so they always land in a distinct family.
    components.forEach((_, i) => {
      const base = baseColors[i]
      if (base.isSemantic) return

      const collisions = countCollisions(base.h, false)
      result[i] = this.applyHashVariation(base.h, base.s, base.l, collisions)
      usedHues.push({ h: hashVariedHue(base.h, collisions), isSemantic: false })
    })

    return result
  }

  /**
   * Generates a definitive map of components to colors and strokes to colors for a character.
   * This ensures StrokeAnimator and TestView use the exact same color mappings.
   */
  public getCharacterColorInfo(character: string): {
    components: { component: string; color: string; pathKey: string }[]
    strokeColors: string[]
  } {
    const matches = this.matchMap.get(character)

    let isAtomic = false
    let atomicComponent = character
    const decomp = this.decompositionMap.get(character)

    if (!decomp) {
      isAtomic = true
    } else if (typeof decomp === 'string') {
      const tokens = this.tokenizeIds(decomp).filter((t) => {
        const code = t.codePointAt(0) || 0
        return code < 0x2ff0 || code > 0x2ffb
      })
      if (tokens.length === 1) {
        isAtomic = true
        atomicComponent = tokens[0]
      }
    } else if (Array.isArray(decomp) && (decomp as string[]).length === 1) {
      isAtomic = true
      atomicComponent = (decomp as string[])[0]
    }

    if (
      !matches ||
      matches.length === 0 ||
      isAtomic ||
      !decomp ||
      typeof decomp !== 'string'
    ) {
      const color = this.assignColors([atomicComponent])[0]
      return {
        components: [{ component: atomicComponent, color, pathKey: '0' }],
        strokeColors: matches ? new Array(matches.length).fill(color) : [],
      }
    }

    // 1) Extract ALL component leaves from the IDS tree
    const tokens = this.tokenizeIds(decomp)
    const leaves: { component: string; pathKey: string }[] = []

    const traverse = (offset: number, currentPath: number[]): number => {
      if (offset >= tokens.length) return offset
      const token = tokens[offset]
      const code = token.codePointAt(0) || 0

      if (code >= 0x2ff0 && code <= 0x2ffb) {
        // Operator
        const isTertiary = code === 0x2ff2 || code === 0x2ff3
        const childrenCount = isTertiary ? 3 : 2
        let nextOffset = offset + 1
        for (let i = 0; i < childrenCount; i++) {
          nextOffset = traverse(nextOffset, [...currentPath, i])
        }
        return nextOffset
      } else {
        // Leaf component
        leaves.push({
          component: token,
          pathKey: currentPath.length > 0 ? currentPath.join(',') : '0',
        })
        return offset + 1
      }
    }
    traverse(0, [])

    // 2) Assign a color to every leaf component
    const componentsToColor = leaves.map((l) => l.component)
    const assignedColors = this.assignColors(componentsToColor)

    const pathToColor = new Map<string, string>()
    leaves.forEach((leaf, i) =>
      pathToColor.set(leaf.pathKey, assignedColors[i]),
    )

    // Build the final component list
    const componentsList = leaves.map((leaf, i) => {
      // If the leaf's pathKey never appears in the matches array, color it black in the UI
      const hasStrokes = matches.some((m) => m && m.join(',') === leaf.pathKey)
      return {
        component: leaf.component,
        color: hasStrokes ? assignedColors[i] : '#000000',
        pathKey: leaf.pathKey,
      }
    })

    // 3) Map strokes to the assigned colors
    const strokeToPathKey = new Map<number, string>()
    matches.forEach((pathArr, index) => {
      if (pathArr && pathArr.length > 0) {
        strokeToPathKey.set(index, pathArr.join(','))
      }
    })

    const strokeColors = matches.map((_, index) => {
      const pathKey = strokeToPathKey.get(index)

      if (pathKey && pathToColor.has(pathKey)) {
        return pathToColor.get(pathKey)!
      }
      return '#333333'
    })

    return { components: componentsList, strokeColors }
  }

  private getBaseColorHSL(componentKey: string): [number, number, number] {
    let semanticColor = this.getSemanticColor(componentKey)
    if (semanticColor && /^#[0-9A-F]{6,8}$/i.test(semanticColor)) {
      let r = parseInt(semanticColor.slice(1, 3), 16) / 255
      let g = parseInt(semanticColor.slice(3, 5), 16) / 255
      let b = parseInt(semanticColor.slice(5, 7), 16) / 255
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b)
      let h = 0,
        s = 0,
        l = (max + min) / 2
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0)
            break
          case g:
            h = (b - r) / d + 2
            break
          case b:
            h = (r - g) / d + 4
            break
        }
        h /= 6
      }
      return [h * 360, s * 100, l * 100]
    }

    // Hash fallback
    let hash = 0
    // Use a slightly better string hash (djb2) to reduce close collisions on similar short strings
    for (let i = 0; i < componentKey.length; i++) {
      hash = (hash << 5) + hash + componentKey.charCodeAt(i)
      hash |= 0
    }

    // Mix the hash a bit more to spread values
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b)
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35)
    hash ^= hash >>> 16

    const index = Math.abs(hash)

    // heavily quantize to ensure they feel strongly distinct.
    const steps = 24
    const hueStepSize = 360 / steps
    const hueIndex = index % steps
    const baseHue = hueIndex * hueStepSize

    // Base saturation and lightness
    // Mute the saturation so auto-generated colors aren't so neon/jarring.
    const baseSat = 45 + (index % 30) // 45-75% (muted pastels to mid-tones)
    let baseLight = 45 + ((index >> 5) % 25) // 45-70% (slightly lighter, softer)

    // Enforce Yellow/Amber constraints (Hue 35-65) on base colors
    // Yellows easily vanish against a white background if they are too bright.
    if (baseHue >= 35 && baseHue <= 65) {
      baseLight = Math.min(baseLight, 50)
    }

    return [baseHue, baseSat, baseLight]
  }

  public getColorForComponent(
    componentKey: string,
    occurrenceIndex: number = 0,
  ): string {
    const isSemantic = !!this.getSemanticColor(componentKey)
    const [h, s, l] = this.getBaseColorHSL(componentKey)
    return isSemantic
      ? this.applySemanticVariation(h, s, l, occurrenceIndex)
      : this.applyHashVariation(h, s, l, occurrenceIndex)
  }

  /**
   * Variation for SEMANTIC (predefined) components.
   * Keeps the color as close to the theme color as possible:
   *   - index 0 → exact theme color (no shift at all)
   *   - index > 0 → small hue nudge of ±30° per step plus a lightness bump,
   *     so the component stays recognisably in the same color family.
   */
  private applySemanticVariation(
    h: number,
    s: number,
    l: number,
    index: number,
  ): string {
    if (index === 0) {
      return this.enforceYellowConstraint(h, s, l)
    }
    // Small hue nudge: ±30° per collision level, alternating sign.
    const sign = index % 2 === 0 ? 1 : -1
    const magnitude = Math.ceil(index / 2)
    const newH = (h + sign * 30 * magnitude + 360) % 360
    // Also bump lightness so the varied version stands out a bit from the anchor.
    const newL = Math.min(Math.max(l + sign * 15 * magnitude, 25), 75)
    return this.enforceYellowConstraint(newH, s, newL)
  }

  /**
   * Variation for HASH-BASED (auto-generated) components.
   * Uses aggressive 120° hue jumps so these components always land in a
   * completely different color family from any anchor or each other.
   */
  private applyHashVariation(
    h: number,
    s: number,
    l: number,
    index: number,
  ): string {
    if (index === 0) {
      return this.enforceYellowConstraint(h, s, l)
    }
    const sign = index % 2 === 0 ? 1 : -1
    const magnitude = Math.ceil(index / 2)
    const newH = (h + sign * 120 * magnitude + 360) % 360
    return this.enforceYellowConstraint(newH, s, l)
  }

  /** Darkens yellows/ambers (hue 35-65) that would be illegible on white. */
  private enforceYellowConstraint(h: number, s: number, l: number): string {
    let newL = l
    if (h >= 35 && h <= 65) {
      newL = Math.min(newL, 50)
    }
    return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${newL.toFixed(1)}%)`
  }

  public getDecomposition(character: string): string | undefined {
    return this.decompositionMap.get(character)
  }

  public getRthList(): string[] {
    return this.rthList
  }

  public getKeyword(
    character: string,
    preferCharacter: boolean = false,
  ): string | undefined {
    if (preferCharacter) {
      // 1. Try character keyword first
      if (this.characterKeywords.has(character)) {
        return this.characterKeywords.get(character)
      }
      // 2. Try component keyword
      if (this.componentKeywords.has(character)) {
        return this.componentKeywords.get(character)
      }
    } else {
      // 1. Try component keyword
      if (this.componentKeywords.has(character)) {
        return this.componentKeywords.get(character)
      }
      // 2. Try character keyword
      if (this.characterKeywords.has(character)) {
        return this.characterKeywords.get(character)
      }
    }

    // Handle bracketed component fallback: [keyword] -> keyword
    if (character.startsWith('[') && character.endsWith(']')) {
      const inner = character.slice(1, -1)
      if (inner) return inner
    }

    return undefined
  }

  public getCanonicalComponent(component: string): string {
    return component
  }

  public getComponents(character: string): string[] {
    const decomp = this.decompositionMap.get(character)
    if (!decomp) return []

    return this.tokenizeIds(decomp).filter((token) => {
      const code = token.codePointAt(0) || 0
      // Keep everything that's not an IDS operator (U+2FF0 to U+2FFB)
      return code < 0x2ff0 || code > 0x2ffb
    })
  }
}
