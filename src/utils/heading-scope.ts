import { Config } from 'ankibridge/notes/base'
import yup from 'ankibridge/utils/yup'
import { load } from 'js-yaml'

export type HeadingScopeConfig = Pick<Config, 'deck' | 'deckName' | 'tags' | 'headingAsTag'>

interface HeadingNode {
    level: number
    startLine: number
    endLine: number
    title: string
    scope?: HeadingScopeConfig
}

const HeadingScopeSchema: yup.SchemaOf<HeadingScopeConfig> = yup.object({
    deck: yup.string().emptyAsUndefined().nullAsUndefined(),
    deckName: yup.string().emptyAsUndefined().nullAsUndefined(),
    tags: yup.array().of(yup.string()).notRequired(),
    headingAsTag: yup.boolean().nullAsUndefined(),
})

function parseHeadingScope(configText: string): HeadingScopeConfig {
    const configObj = (load(configText) || {}) as HeadingScopeConfig
    return HeadingScopeSchema.validateSync(configObj)
}

function isFenceStart(line: string): RegExpMatchArray | null {
    return line.match(/^([`~]{3,})(.*)$/)
}

function isHeading(line: string): RegExpMatchArray | null {
    return line.match(/^(#{1,6})[ \t]+(.+?)\s*$/)
}

export function resolveHeadingScopeForLine(
    source: string,
    lineNumber: number,
): HeadingScopeConfig | undefined {
    const lines = source.split('\n')
    const headings: HeadingNode[] = []
    const stack: HeadingNode[] = []

    let activeFence: string | null = null
    let activeScopeFence: string | null = null
    let activeScopeHeading: HeadingNode | null = null
    let activeScopeStartLine: number | null = null
    let activeScopeBuffer: string[] = []

    const closeHeadingLevels = (level: number, endLine: number) => {
        while (stack.length && stack[stack.length - 1].level >= level) {
            stack.pop()!.endLine = endLine
        }
    }

    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx]
        const lineNumberHere = idx + 1

        if (activeScopeFence !== null) {
            if (line.trim() === activeScopeFence) {
                if (activeScopeHeading === null || activeScopeStartLine === null) {
                    throw new Error('Unexpected anki-scope parser state')
                }
                if (activeScopeHeading.scope !== undefined) {
                    throw new Error(
                        `Multiple anki-scope blocks found for heading on line ${activeScopeHeading.startLine}`,
                    )
                }

                activeScopeHeading.scope = parseHeadingScope(activeScopeBuffer.join('\n'))
                activeScopeFence = null
                activeScopeHeading = null
                activeScopeStartLine = null
                activeScopeBuffer = []
                continue
            }

            activeScopeBuffer.push(line)
            continue
        }

        if (activeFence !== null) {
            if (line.trim() === activeFence) {
                activeFence = null
            }
            continue
        }

        const headingMatch = isHeading(line)
        if (headingMatch) {
            const level = headingMatch[1].length
            closeHeadingLevels(level, lineNumberHere - 1)

            const heading: HeadingNode = {
                level,
                startLine: lineNumberHere,
                endLine: lines.length,
                title: headingMatch[2].trim(),
            }
            headings.push(heading)
            stack.push(heading)
            continue
        }

        const fenceStart = isFenceStart(line)
        if (fenceStart) {
            const marker = fenceStart[1]
            const info = fenceStart[2].trim()

            if (info === 'anki-scope' && stack.length) {
                activeScopeFence = marker
                activeScopeHeading = stack[stack.length - 1]
                activeScopeStartLine = lineNumberHere
                activeScopeBuffer = []
                continue
            }

            activeFence = marker
        }
    }

    closeHeadingLevels(0, lines.length)

    const activeHeadings = headings
        .filter((heading) => heading.scope !== undefined)
        .filter((heading) => heading.startLine <= lineNumber && lineNumber <= heading.endLine)
        .sort((a, b) => a.level - b.level)

    if (!activeHeadings.length) {
        return undefined
    }

    const resolved: HeadingScopeConfig = { tags: [] }
    for (const heading of activeHeadings) {
        const scope = heading.scope!
        if (scope.deck !== undefined) {
            resolved.deck = scope.deck
        }
        if (scope.deckName !== undefined) {
            resolved.deckName = scope.deckName
        }
        if (scope.tags?.length) {
            resolved.tags = [...(resolved.tags || []), ...scope.tags]
        }
        if (scope.headingAsTag) {
            resolved.tags = [...(resolved.tags || []), heading.title]
        }
    }

    return resolved
}
