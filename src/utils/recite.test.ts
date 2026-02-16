import { toReciteCards } from 'ankibridge/utils/recite'

describe('recite utils', () => {
    it('splits text into cards with context windows', () => {
        const cards = toReciteCards('甲，乙。丙！丁？', 1, 2)

        expect(cards).toHaveLength(2)
        expect(cards[0]).toMatchObject({
            context: '[开头]',
            recite: '甲，乙。',
        })
        expect(cards[1]).toMatchObject({
            context: '乙。',
            recite: '丙！丁？□',
        })
    })
})
