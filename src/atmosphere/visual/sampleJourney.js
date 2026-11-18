// Sample story and paintings for the Visual Journey preview.
//
// The text was written for this preview (no copyright). The paintings were
// drawn by code (tools/visual-samples/), not by an image model, so the stage
// can be judged before real generated images exist.
//
// Each scene's painting is unlocked only after its first two paragraphs (its
// "source window") have been read, exactly as a generated image would be.

import { segmentBlocks } from '../../narration/segmenter.js'

export const SAMPLE_SECTION = 'sample'

const SCENES = [
  {
    id: 'evening-sea', title: 'Evening, the bay', focus: { x: 0.68, y: 0.57 },
    paragraphs: [
      'The ferry came round the headland as the sun went down, and the whole of the bay turned the colour of a ripe apricot. Nell stood at the rail with her coat buttoned to the chin. The water was so still that the sun seemed to have two halves, one in the sky and one laid flat upon the sea.',
      'A single sail stood out against the light, small and black, as if someone had cut it from paper and pinned it to the horizon. Behind her the engine thudded on. There was only the long gold road across the water, and the boat moving slowly along it.',
      'She had not been home in nine years. She tried to remember the harbour, and found she could recall only small things: a blue door, a rope coiled on a bollard, the smell of tar on a hot afternoon. The rest had worn away, the way the names wear off a coin.',
      'When the sun touched the water at last, the gold went out of everything at once. The sea darkened to violet. The first lights of the town came on along the shore, one and then another, as if the place were waking to meet her.',
    ],
  },
  {
    id: 'morning-hills', title: 'Morning, the lane', focus: { x: 0.58, y: 0.64 },
    paragraphs: [
      'In the morning the mist lay in the valleys like milk in a saucer. Nell left the inn early and took the lane that climbed away from the town, between hedges still grey with dew. Below her the hills went back fold after fold, each one paler than the last.',
      'The lane was pale and dry and wound between the round dark trees like a ribbon dropped on a green cloth. Far ahead a single figure was walking the same way, small as a full stop. She did not try to catch them up. It was pleasant to have company at that distance, and to need to say nothing at all.',
      'Larks went up from the fields on either side, and the sun came through by degrees, warming her shoulders. She found she was walking faster than she meant to. Some part of her had remembered the way before the rest of her had, and it was hurrying her on.',
      'By the time the mist had burned away she could see the chimney of the house above the last rise, and a thin thread of smoke going straight up into the still air.',
    ],
  },
  {
    id: 'rain-house', title: 'Dusk, the house', focus: { x: 0.5, y: 0.5 },
    paragraphs: [
      'The rain came on just as she reached the gate, all at once, as if a door had been opened somewhere in the sky. In a moment the light was gone from the afternoon. The house stood dark against the slate of the clouds, the trees around it black and dripping, and every window was lit.',
      'The lamplight lay in long yellow bars across the wet grass. Water ran from the eaves and drummed on the step. She stood a moment with her hand on the cold iron of the gate, getting wet and not minding, because the windows looked exactly as they had when she was a child, coming home in the dusk.',
      'Then the door opened, and a voice she knew called her name, half laughing, half scolding, and asked whether she meant to stand out there until she drowned.',
      'She went up the path with her bag banging against her knee. The rain followed her right to the threshold and stopped there, as rain does, as if it too had been taught to wipe its feet.',
    ],
  },
  {
    id: 'candle-interior', title: 'Night, the back room', focus: { x: 0.58, y: 0.5 },
    paragraphs: [
      'Late that night, when the others had gone up, she sat on alone in the small back room with a single candle on the table. Through the window the sky had cleared, and the moon stood high and white above the dark garden, looking in at her through the old crossed panes.',
      'The candle made a small warm world around itself: the scrubbed boards of the table, a cup gone cold, a red book she had not yet opened. Beyond its reach the corners of the room were brown and soft and full of shadow, and the clock on the stairs ticked slowly, as though it had all the time there was.',
      'She opened the book at last. It was the one she had left behind, and her own handwriting was inside the cover, round and careful, the hand of someone much younger. She read the name twice, as if it belonged to somebody she had once known well.',
      'When the candle began to gutter she pinched it out, and sat a little longer in the moonlight before she went up to bed.',
    ],
  },
  {
    id: 'winter-wood', title: 'Winter, the wood', focus: { x: 0.5, y: 0.6 },
    paragraphs: [
      'The winter came early that year. By the first week of December the fields beyond the house lay under snow, and the wood at the edge of them had turned to a drawing in black ink, every branch set down plain against a sky the colour of the inside of a shell.',
      'Nell walked there most afternoons when the light began to go. The snow took the blue of the sky into its hollows and the pink of the low sun on its crests. Once, far off across the white, she saw someone crossing towards the farm, small and dark and steady, and then the trees hid them.',
      'She had meant to stay a week. It was almost three months now. Nobody had asked her when she was leaving, and she had stopped asking herself.',
      'On the way back she stopped at the edge of the wood and looked at the house, its windows just beginning to glow, and understood that she had already decided, some while ago, without telling anyone, least of all herself.',
    ],
  },
]

/** Build blocks, segments, scene starts and the image set for the preview. */
export function buildSampleJourney(base = '/visual-samples/') {
  const blocks = []
  const scenes = []
  const images = []
  let n = 0
  SCENES.forEach((scene, si) => {
    if (si > 0) blocks.push({ id: `b${n++}`, type: 'break', text: '' })
    const first = n
    scene.paragraphs.forEach(text => blocks.push({ id: `b${n++}`, type: 'paragraph', text, scene: si }))
    scenes.push({ index: si, id: scene.id, title: scene.title, startBlock: `b${first}` })
  })
  const segments = segmentBlocks(blocks, { maxChars: 170 })
  SCENES.forEach((scene, si) => {
    // Source window = the scene's first two paragraphs. Visible after its last segment.
    const windowEndBlock = `b${Number(scenes[si].startBlock.slice(1)) + 1}`
    const last = segments.filter(s => s.blockId === windowEndBlock).pop()
    images.push({
      id: scene.id,
      src: `${base}${scene.id}.webp`,
      strokes: `${base}${scene.id}.strokes.webp`,
      focus: scene.focus,
      sceneIndex: si,
      visibleAfter: { sectionId: SAMPLE_SECTION, blockId: last.blockId, segmentId: last.id },
    })
  })
  return { blocks, segments, scenes, images, sectionOrder: [SAMPLE_SECTION] }
}
