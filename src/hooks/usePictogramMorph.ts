import { useEffect, useState, useRef } from 'react'
import { animate, useMotionValue, type AnimationPlaybackControls } from 'framer-motion'
import { interpolate } from 'flubber'

type UsePictogramMorphProps = {
    character: string
    enabled: boolean
    targetPath: string[]
    onMorphComplete?: () => void
    onFadeComplete?: () => void
}

const MORPH_DURATION = 2.0
const FADE_OUT_DURATION = 0.5
const HOLD_DURATION = 1.0 // How long to show pictogram before morphing

/**
 * Robustly inverts Y coordinates of an SVG path string from Y-down to Y-up.
 * Assumes a 1024x1024 coordinate system.
 */
const invertPathY = (d: string): string => {
    // Regex to find commands and their numbers
    const commandRegex = /([a-df-z])([^a-df-z]*)/ig;
    let match;
    let result = '';

    while ((match = commandRegex.exec(d)) !== null) {
        const command = match[1];
        const argsStr = match[2].trim();
        const args = argsStr ? argsStr.split(/[ ,]+/).map(parseFloat) : [];

        if (command.toUpperCase() === 'M' || command.toUpperCase() === 'L') {
            // M/L: x, y, x, y... pairs
            for (let i = 0; i < args.length; i += 2) {
                if (args[i + 1] !== undefined) {
                    args[i + 1] = 1024 - args[i + 1];
                }
            }
        } else if (command.toUpperCase() === 'A') {
            // A: rx ry x-axis-rotation large-arc-flag sweep-flag x y
            for (let i = 0; i < args.length; i += 7) {
                // Invert sweep flag (index 4)
                if (args[i + 4] !== undefined) {
                    args[i + 4] = args[i + 4] === 0 ? 1 : 0;
                }
                // Invert target y (index 6)
                if (args[i + 6] !== undefined) {
                    args[i + 6] = 1024 - args[i + 6];
                }
            }
        }
        // For 'Z', args will be empty.

        result += command + ' ' + args.join(' ') + ' ';
    }
    return result.trim();
};

export function usePictogramMorph({
    character,
    enabled,
    targetPath,
    onMorphComplete,
    onFadeComplete
}: UsePictogramMorphProps) {
    const [pictogramPaths, setPictogramPaths] = useState<string[]>([])
    const [morphPaths, setMorphPaths] = useState<string[]>([])
    const [isActive, setIsActive] = useState(false)
    const progress = useMotionValue(0)
    const overlayOpacity = useMotionValue(0)
    const overlayScale = useMotionValue(1)

    const controlsRef = useRef<AnimationPlaybackControls | null>(null)
    const interpolatorRef = useRef<((t: number) => string[]) | null>(null)

    // Reset state when character changes
    useEffect(() => {
        setPictogramPaths([])
        setMorphPaths([])
        setIsActive(false)
        progress.set(0)
        overlayOpacity.set(0)
        overlayScale.set(1)
        if (controlsRef.current) {
            controlsRef.current.stop()
            controlsRef.current = null
        }
    }, [character, progress, overlayOpacity, overlayScale])

    // Fetch pictogram
    useEffect(() => {
        let active = true

        // If disabled, we still wait for targetPath to exist before signaling "done"
        // so that the consumer (StrokeAnimator) doesn't show a half-ready writer
        if (!enabled) {
            if (targetPath.length > 0) {
                requestAnimationFrame(() => {
                    onMorphComplete?.()
                    onFadeComplete?.()
                })
            }
            return
        }

        const loadPictogram = async () => {
            try {
                const modules = import.meta.glob('../assets/pictograms/*.svg', {
                    query: '?raw',
                    import: 'default'
                })

                const pathKey = `../assets/pictograms/${character}.svg`
                const loader = modules[pathKey] as (() => Promise<string>) | undefined

                if (!loader) {
                    if (active && targetPath.length > 0) {
                        requestAnimationFrame(() => {
                            onMorphComplete?.()
                            onFadeComplete?.()
                        })
                    }
                    return
                }

                const text = await loader()
                const parser = new DOMParser()
                const doc = parser.parseFromString(text, 'image/svg+xml')
                const pathElements = Array.from(doc.querySelectorAll('path'))

                if (active && pathElements.length > 0) {
                    const allPaths: string[] = []
                    pathElements.forEach(el => {
                        const d = el.getAttribute('d')
                        if (d) {
                            // Split each path into subpaths
                            const subpaths = d.split(/(?=[mM])/).filter(p => p.trim().length > 0)
                            // INVERT Y: Crucial to match HanziWriter's Y-up space
                            const inverted = subpaths.map(p => invertPathY(p))
                            allPaths.push(...inverted)
                        }
                    })
                    setPictogramPaths(allPaths)
                } else if (active) {
                    // No valid paths found, trigger completion for UI sync
                    if (targetPath.length > 0) {
                        requestAnimationFrame(() => {
                            onMorphComplete?.()
                            onFadeComplete?.()
                        })
                    }
                }
            } catch (err) {
                // Silent catch
            }
        }

        loadPictogram()
        return () => { active = false }
    }, [character, enabled, targetPath])

    // Run animation
    useEffect(() => {
        if (pictogramPaths.length === 0 || targetPath.length === 0 || !enabled) return

        const maxLen = Math.max(pictogramPaths.length, targetPath.length)

        const padArray = (arr: string[], len: number) => {
            const res = [...arr]
            const last = res[res.length - 1]
            while (res.length < len) {
                res.push(last)
            }
            return res
        }

        const source = padArray(pictogramPaths, maxLen)
        const target = padArray(targetPath, maxLen)

        try {
            const interpolators = source.map((s, i) => interpolate(s, target[i], { maxSegmentLength: 10 }))
            interpolatorRef.current = (t: number) => interpolators.map(fn => fn(t))
        } catch (err) {
            return
        }

        setIsActive(true)
        setMorphPaths(source)
        overlayOpacity.set(1)
        progress.set(0)

        const runMorph = () => {
            controlsRef.current = animate(progress, 1, {
                duration: MORPH_DURATION,
                delay: HOLD_DURATION,
                ease: "easeInOut",
                onUpdate: (latest) => {
                    if (interpolatorRef.current) {
                        setMorphPaths(interpolatorRef.current(latest))
                    }
                    if (latest === 1) onMorphComplete?.()
                },
                onComplete: runFadeOut
            })
        }

        const runFadeOut = () => {
            controlsRef.current = animate(overlayOpacity, 0, {
                duration: FADE_OUT_DURATION,
                delay: 0.2,
                onComplete: () => {
                    setIsActive(false)
                    onFadeComplete?.()
                }
            })
        }

        runMorph()

        return () => {
            if (controlsRef.current) {
                controlsRef.current.stop()
            }
        }
    }, [pictogramPaths, targetPath, enabled, progress, overlayOpacity])

    return {
        morphPaths,
        pictogramPaths,
        overlayStyle: {
            opacity: overlayOpacity,
            scale: overlayScale
        },
        progress,
        isActive
    }
}
