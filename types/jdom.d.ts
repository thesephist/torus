import {
    JDOM,
} from './torus'

declare function jdom(templateParts: TemplateStringsArray, ...dynamicParts: any[]): JDOM

export {
    jdom,
}
