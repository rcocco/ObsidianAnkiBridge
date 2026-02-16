import { NoteBase } from 'ankibridge/notes/base'
import { arrayBufferToBase64 } from 'ankibridge/utils/encoding'
import { TFile } from 'obsidian'

export type AnkiBasicField = 'Front' | 'Back'
export type AnkiClozeField = 'Text' | 'Back Extra'
export type AnkiEnhancedClozeField = 'Content' | 'Note'
export type AnkiLpcgField = 'Line' | 'Context' | 'Title' | 'Author' | 'Sequence' | 'Prompt'
export type AnkiField = AnkiBasicField | AnkiClozeField | AnkiEnhancedClozeField | AnkiLpcgField

export type AnkiFields =
    | Record<AnkiBasicField, string>
    | Record<AnkiClozeField, string>
    | Record<AnkiEnhancedClozeField, string>
    | Record<AnkiLpcgField, string>

export enum NoteField {
    Frontlike,
    Backlike,
    Title,
    Author,
    Sequence,
    Prompt,
}
export type NoteFields = Partial<Record<NoteField, string | null>>

export type ModelName = 'Basic' | 'Cloze' | 'Enhanced Cloze 2.1 v2' | 'LPCG 1.0'

export interface SourceDescriptor {
    from: number
    to: number
    file: TFile
}

export interface Fragment {
    text: string
    sourceFile: TFile
    sourceOffset: number
}

export class FragmentProcessingResult extends Array<NoteBase | Fragment> {
    public renderAsText(): string {
        let text = ''

        for (const element of this) {
            if (!(element instanceof NoteBase)) {
                text += element['text']
                continue
            }

            text += element.renderAsText()
        }

        return text
    }
}

export enum NoteAction {
    Created,
    Recreated,
    Deleted,
    Updated,
    Skipped,
    Checked,
    NonFatalError,
}

export type MediaType = 'image' | 'video' | 'audio'

export class Media {
    constructor(
        public filename: string,
        public path: string,
        public type: MediaType,
        public data: ArrayBuffer,
        public fields: Array<NoteField>,
    ) {}

    public async toBase64(): Promise<string> {
        return await arrayBufferToBase64(this.data)
    }
}
