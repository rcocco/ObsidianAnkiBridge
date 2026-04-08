const CONFIG_PROPERTY_RE = /^[A-Za-z_][A-Za-z0-9_-]*:\s*(.*)$/

export const ANKI_SHORTCUT_START_TAG = '```anki\n'
export const ANKI_SHORTCUT_END_TAG = '\n```'

function isConfigPropertyLine(line: string): boolean {
    return CONFIG_PROPERTY_RE.test(line)
}

function isConfigContinuationLine(line: string): boolean {
    const trimmed = line.trim()

    return line.startsWith(' ') || line.startsWith('\t') || trimmed.startsWith('- ')
}

function getLeadingConfigEndIndex(lines: string[]): number {
    let idx = 0
    let foundConfig = false

    while (idx < lines.length) {
        const line = lines[idx]

        if (!isConfigPropertyLine(line)) {
            break
        }

        foundConfig = true
        idx++

        while (idx < lines.length) {
            const continuation = lines[idx]

            if (continuation.trim() === '---') {
                break
            }

            if (!isConfigContinuationLine(continuation)) {
                break
            }

            idx++
        }
    }

    return foundConfig ? idx : 0
}

export function formatSelectionForAnkiShortcutWrap(content: string): string {
    const lines = content.split('\n')
    const configEnd = getLeadingConfigEndIndex(lines)

    if (configEnd === 0) {
        if (lines[0]?.trim() === '---') {
            return content
        }

        return ['---', ...lines].join('\n')
    }

    if (configEnd >= lines.length || lines[configEnd].trim() === '---') {
        return content
    }

    return [...lines.slice(0, configEnd), '---', ...lines.slice(configEnd)].join('\n')
}

export function formatSelectionForAnkiShortcutUnwrap(content: string): string {
    const lines = content.split('\n')
    const configEnd = getLeadingConfigEndIndex(lines)

    if (configEnd === 0) {
        if (lines[0]?.trim() !== '---') {
            return content
        }

        return lines.slice(1).join('\n')
    }

    if (configEnd >= lines.length || lines[configEnd].trim() !== '---') {
        return content
    }

    return [...lines.slice(0, configEnd), ...lines.slice(configEnd + 1)].join('\n')
}

export function buildAnkiShortcutWrappedSelection(content: string): string {
    return `${ANKI_SHORTCUT_START_TAG}${formatSelectionForAnkiShortcutWrap(content)}${ANKI_SHORTCUT_END_TAG}\n\n`
}

export function getAnkiShortcutPostFencePaddingLength(textAfterFence: string): number {
    return textAfterFence.startsWith('\n\n') ? 2 : 0
}
