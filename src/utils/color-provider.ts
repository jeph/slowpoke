export interface ColorProvider {
  getRandomColor: () => number;
  getSuccessColor: () => number;
  getWarningColor: () => number;
  getErrorColor: () => number;
  getPrimaryColor: () => number;
}

export const createColorProvider = (): ColorProvider => {
  return {
    getRandomColor: () => allColors[Math.floor(Math.random() * allColors.length)],
    getSuccessColor: () => emerald,
    getWarningColor: () => sunFlower,
    getErrorColor: () => pomegranate,
    getPrimaryColor: () => peterRiver
  }
}

const peterRiver = 0x3498db
const amethyst = 0x9b59b6
const wetAsphalt = 0x34495e
const greenSea = 0x16a085
const nephritis = 0x27ae60
const sunFlower = 0xf1c40f
const carrot = 0xe67e22
const alizarin = 0xe74c3c
const clouds = 0xecf0f1
const concrete = 0x95a5a6
const orange = 0xe67e22
const pumpkin = 0xd35400
const pomegranate = 0xc0392b
const silver = 0xbdc3c7
const asbestos = 0x7f8c8d
const turquoise = 0x1abc9c
const emerald = 0x2ecc71
const belizeHole = 0x2980b9
const wisteria = 0x8e44ad
const midnightBlue = 0x2c3e50

const allColors = [
  peterRiver,
  amethyst,
  wetAsphalt,
  greenSea,
  nephritis,
  sunFlower,
  carrot,
  alizarin,
  clouds,
  concrete,
  orange,
  pumpkin,
  pomegranate,
  silver,
  asbestos,
  turquoise,
  emerald,
  belizeHole,
  wisteria,
  midnightBlue,
]
