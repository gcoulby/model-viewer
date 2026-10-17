import ecore from './samples/ecore.ecore?raw'
import library from './samples/library.ecore?raw'
import shopCore from './samples/shop/core.ecore?raw'
import shopOrders from './samples/shop/orders.ecore?raw'

export interface SampleFile {
  name: string
  text: string
}

export interface Sample {
  id: string
  label: string
  description: string
  files: SampleFile[]
}

export const SAMPLES: Sample[] = [
  {
    id: 'library',
    label: 'Library',
    description: 'Small model with inheritance, enums and opposite references',
    files: [{ name: 'library.ecore', text: library }],
  },
  {
    id: 'ecore',
    label: 'Ecore',
    description: 'The Ecore metamodel itself, a large and dense model',
    files: [{ name: 'Ecore.ecore', text: ecore }],
  },
  {
    id: 'shop',
    label: 'Shop (two files)',
    description: 'Two files whose references are joined across files',
    files: [
      { name: 'core.ecore', text: shopCore },
      { name: 'orders.ecore', text: shopOrders },
    ],
  },
]
