
const PROP_TEXT = '#text';
const PROP_CONTENT = '#content';

interface XMLDocument {
	[K: string]: XMLElement;
}
type XMLElement = Record<`@${ string }`, string> & ({
	[PROP_TEXT]: string,
} | {
	[PROP_TEXT]: string[],
})


function sanitize(s: string): string {
	return s
		.replace(/"/g, '&quot;')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
	;
}


function propToString(name: string, value: JSONObject): string {
	const attrs: string = [...Object.entries(value)]
		.filter(([attr_name, _val]) => attr_name[0] === '@')
		.map(([attr_name, val]) => ` ${ attr_name.slice(1) }="${ sanitize(val) }"`)
		.join('')
	;
	const content:          readonly string[] | null = value[PROP_CONTENT] || null;
	const text:    string | readonly string[] | null = value[PROP_TEXT]    || null;
	return `<${ name }${ attrs }>${
		(content || text)
			? (typeof text === 'string')
				? text
				: (content || []).map((path) => {
					const [key_name, index]: [string, string?] = path.split('/') as [string, string?];
					return (index === void 0)
						? propToString(key_name, value[key_name])
						: (key_name === PROP_TEXT)
							? text[+index]
							: propToString(key_name, value[key_name][+index])
					;
				}).join('')
			: ''
	}</${ name }>`;
}

export function jsonToXML(json: JSONObject, elname: string): string {
	return propToString(elname, json[elname]);
}
