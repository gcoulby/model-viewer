/** A new, empty Ecore file with one root package, in the shape Eclipse writes. */
export function newModelText(packageName: string): string {
  const name = packageName.replace(/[^A-Za-z0-9_]/g, '') || 'model'
  return `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="${name}" nsURI="http://www.example.org/${name}" nsPrefix="${name}"/>
`
}
