const DESIGN_WIDTH = 1920
const BASE_FONT_SIZE = DESIGN_WIDTH / 10

function setRootFontSize() {
  const clientWidth = document.documentElement.clientWidth
  const scale = clientWidth / DESIGN_WIDTH
  document.documentElement.style.fontSize = `${BASE_FONT_SIZE * Math.min(scale, 2)}px`
}

setRootFontSize()
window.addEventListener('resize', setRootFontSize)