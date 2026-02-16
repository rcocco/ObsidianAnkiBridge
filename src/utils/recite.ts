export interface ReciteCard {
    context: string
    recite: string
}

const RECITE_LINE_REGEX = /[^，。！？；：”]+[，。！？；：”]+/g

export function toReciteCards(
    text: string,
    contextLines: number = 3,
    reciteLines: number = 2,
): Array<ReciteCard> {
    const safeContextLines = Math.max(0, Math.floor(contextLines))
    const safeReciteLines = Math.max(1, Math.floor(reciteLines))

    const paragraphs = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

    const lines: Array<string> = []
    for (let p = 0; p < paragraphs.length; p += 1) {
        const paragraph = paragraphs[p]
        const paragraphLines = paragraph.match(RECITE_LINE_REGEX) || [paragraph]
        if (paragraphLines.length === 0) {
            continue
        }

        const isLastParagraph = p === paragraphs.length - 1
        if (!isLastParagraph) {
            paragraphLines[paragraphLines.length - 1] += '⊗'
        }

        lines.push(...paragraphLines)
    }

    if (lines.length > 0) {
        lines[lines.length - 1] += '□'
    }

    const cards: Array<ReciteCard> = []
    const mergeToText = (parts: Array<string>) => parts.join('').replace(/⊗/g, '\n')

    for (let i = 0; i < lines.length; i += safeReciteLines) {
        const recite = lines.slice(i, i + safeReciteLines)
        if (recite.length === 0) {
            break
        }

        let contextStart = i - safeContextLines
        if (contextStart < 0) {
            contextStart = 0
        }
        const context = lines.slice(contextStart, i)

        if (safeContextLines > 0 && i < safeContextLines) {
            context.unshift('[开头]')
        }

        cards.push({
            context: mergeToText(context),
            recite: mergeToText(recite),
        })
    }

    return cards
}
