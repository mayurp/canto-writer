import { useCharacterDataContext } from '../context/CharacterDataContext'
import { motion, AnimatePresence } from 'framer-motion'
import './styles/ComponentCards.css'

type ComponentCardsProps = {
  character: string
  visible?: boolean // Default to true if not provided
}

export function ComponentCards({
  character,
  visible = true,
}: ComponentCardsProps) {
  const { characterData } = useCharacterDataContext()
  const decomposition = characterData?.getDecomposition(character)
  const colorInfo = characterData?.getCharacterColorInfo(character)
  const componentsList = colorInfo?.components || []

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="component-cards-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {componentsList.length > 0 && (
            <div className="component-cards-grid">
              {componentsList.map(({ component: comp, color, pathKey }) => {
                const canonical =
                  characterData?.getCanonicalComponent(comp) || comp
                const compKeyword = characterData?.getKeyword(canonical)
                const isBracketed = comp.startsWith('[') && comp.endsWith(']')
                const displayChar = isBracketed ? comp.slice(1, -1) : comp

                return (
                  <div
                    key={`${comp}-${pathKey}`}
                    className="component-card"
                    style={{ borderBottomColor: color }}
                  >
                    {isBracketed ? (
                      <div className="component-card-bracketed-char cjk-stroke">
                        {displayChar}
                      </div>
                    ) : (
                      <div className="component-card-char-container">
                        <div className="component-card-canonical-char cjk-stroke">
                          {canonical}
                        </div>
                        {canonical !== comp && (
                          <div className="component-card-original-char cjk-stroke">
                            ({comp})
                          </div>
                        )}
                      </div>
                    )}
                    <div className="component-card-keyword">
                      {compKeyword || '-'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {decomposition && !componentsList.length && (
            <div className="component-cards-raw-decomp cjk-stroke">
              <div className="component-cards-raw-decomp-label">
                Raw Decomposition
              </div>
              {decomposition}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
