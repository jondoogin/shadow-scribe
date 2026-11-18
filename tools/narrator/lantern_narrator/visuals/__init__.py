"""Visual journey: painterly scene images that follow the reading position.

Pipeline (docs/VISUAL_JOURNEY.md):
  plan      context-shift scene planning over Lantern's own segments (no model)
  style     one style profile per book, from the title, author and first 2,000 words only
  describe  a scene descriptor from each scene's source window (keyword or local LLM)
  prompt    template prompt from profile + descriptor (code, never the model)
  paint     image model (FLUX.2 klein via mflux) or the deterministic fixture painter
  strokes   the stroke-order map that drives the paint-in animation
  validate  Apple Vision face and text checks where available
  package   a STORED-zip `.lantern-visuals` file Lantern imports

Spoiler rule: every image is made only from text up to its `visibleAfter`
segment, and Lantern shows it only once the reader is past that segment.
"""
