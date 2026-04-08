export function buildAnkiScopeShortcutBlock(): { text: string; cursorOffset: number } {
    const text = ['```anki-scope', 'tags:', '  - ', '```'].join('\n')

    return {
        text,
        cursorOffset: '```anki-scope\ntags:\n  - '.length,
    }
}
