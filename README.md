# xml-to-json
An XML-to-JSON converter and JSON-to-XML converter.



## Usage
// TODO



## XML-to-JSON Algorithm


### Summary
1. XML elements are always represented as JSON objects.
2. XML attributes are repesented as JSON object properties starting with `@`. Their values are strings.
3. Elements containing only text have a `#text` property that is an array containing a string.
4. Elements containing only element children have a `#content` property that is an array of paths to the child objects.
	1. Child elements are represented by object values of a property. Child elements are grouped by tag name.
	2. If the XML child is only-of-type, the property value is that child’s JSON object.
		If there are XML siblings with the same tag name, the property value is an array of JSON objects.
5. Elements with both text and element children have both `#text` and `#content` properties.
	The `#content` includes paths to `#text` entries as well as child objects.
6. The root element is the value of the only property on the top-level object.
	The property name is the root element’s tag name.
	Any other properties on this object must be meta (such as schema validation metadata)
	and not be processed by this specification.


### Details With Examples

1. Every XML element is represented as a JSON object.
	Elements without attributes and without contents are empty objects.
	(We’ll see the tag name later.)
	```xml
	<!-- XML -->
	<p></p>
	```
	```json
	// JSON
	{}
	```

2. Attributes of the XML element are stored as properties of the JSON object. The order of properties can be arbitrary.
	The property key is `@` followed by the attribute name, and the property value is the string attribute value.
	```xml
	<p lang="en" class="sentence"></p>
	```
	```json
	{
		"@class": "sentence",
		"@lang":  "en",
	}
	```

3. If the elemenet contains *only* text, then the object has a `#text` property,
	whose value is a single text string.
	If the element is self-closing (such as `<img src=""/>`), has no contents (such as `<i class=""></i>`),
	or contains only whitespace (such as `<div> <div>`),
	then the `#text` property is omitted.
	The `#text` string, if it exists, will always be non-empty, and if trimmed will also be non-empty.
	Within JSON text values, tabs and line breaks are escaped with `\t` and `\n` respectively.
	```xml
	<p lang="en" class="sentence">The quick brown fox jumps over the lazy dog.</p>
	```
	```json
	{
		"@class": "sentence",
		"@lang":  "en",
		"#text":  "The quick brown fox jumps over the lazy dog.",
	}
	```

4. If the element contains *only* child elements (and no non-whitespace text),
	then it has a `#content` property, which is an array that encodes the order of its children.
	The items of this array are string paths (relative to the parent object) to the children elements.
	The `#content` array, if it exists, will always be non-empty.
	Entries of the array will always be non-empty strings, that if trimmed will also be non-empty.
	The paths are in document order. More on paths below.
	```xml
	<p lang="en" class="sentence">
		<b class="subject">The quick brown fox</b>
		<i class="predicate">jumps over the lazy dog.</i>
	</p>
	```
	```json
	{
		"@class":   "sentence",
		"@lang":    "en",
		"#content": ["...", "..."], // paths to the children… see below
		// children… see below
	}
	```

	1. A child element that is the only of its type (the only sibling with its tag name)
		is stored in a single property of the parent object.
		The name of the property is the element’s tag name, and the value of the property is an object
		representing the child.
		Paths in `#content` point to properties in the parent object.
		```xml
		<p lang="en" class="sentence">
			<i class="subject">The quick brown fox</i>
			<b class="predicate">jumps over the lazy dog.</b>
		</p>
		```
		```json
		{
			"@class":   "sentence",
			"@lang":    "en",
			"#content": ["i", "b"], // `"i"` and `"b"` point to the these properties
			"b":        {"@class": "predicate", "#text": "jumps over the lazy dog."},
			"i":        {"@class": "subject",   "#text": "The quick brown fox"},
		}
		```

	2. A “group” of children with the same tag name is stored in a single property of the parent object.
		The name of the property is the elements’ tag name, and the value of the property is an array of objects
		representing the children in the group.
		The order of array entries preserve document order.
		Paths in `#content` use standard slash-accessor 0-indexed notation.
		(For example, a path of `a/1` would point to the second `a` element.
		Slash instead of dot because `a.1` is a legal XML tag name.)
		```xml
		<p lang="en" class="sentence">
			<span class="subject">The quick brown fox</span>
			<u class="verb">jumps</u>
			<span class="prepositional-phrase">over the lazy dog.</span>
		</p>
		```
		```json
		{
			"@class":   "sentence",
			"@lang":    "en",
			"#content": ["span/0", "u", "span/1"],
			"span": [
				{"@class": "subject",              "#text": "The quick brown fox"},
				{"@class": "prepositional-phrase", "#text": "over the lazy dog."},
			],
			"u": {"@class": "verb", "#text": "jumps"},
		}
		```

5. If the element contains a mix of text and XML elements, then it has both `#text` and `#content` properties.
	The `#text` is an array containing the element’s plaintext strings (excluding element children).
	The `#content` array contains paths to all its children, including text nodes.
	The entries of `#text` and `#content` *must* be in document order.
	The paths in `#content` that reference entries of `#text` do so in standard slash-accessor 0-indexed notation.
	```xml
	<p lang="en" class="sentence">The <em>quick</em> <em>brown</em> <strong>fox</strong>
		<mark>jumps</mark> over the <em>lazy</em> <strong>dog</strong>.</p>
	```
	```json
	{
		"@class":   "sentence",
		"@lang":    "en",
		"#content": ["#text/0", "em/0", "em/1", "strong/0", "mark", "#text/1", "em/2", "strong/1", "#text/2"],
		"#text":    ["The ", " over the ", "."],
		"em": [
			{"#text": "quick"},
			{"#text": "brown"},
			{"#text": "lazy"},
		],
		"mark":   {"#text": "jumps"},
		"strong": [
			{"#text": "fox"},
			{"#text": "dog"},
		],
	}
	```

6. The root XML element is stored in the sole property of the top-level object.
	The name of the property is the XML element’s tag name, and the value of the property
	is an object representing the root element.
	```xml
	<p lang="en" class="sentence">The <em>quick</em> <em>brown</em> <strong>fox</strong>
		<mark>jumps</mark> over the <em>lazy</em> <strong>dog</strong>.</p>
	```
	```json
	{
		"p": {
			"@class":   "sentence",
			"@lang":    "en",
			"#content": ["#text/0", "em/0", "em/1", "strong/0", "mark", "#text/1", "em/2", "strong/1", "#text/2"],
			"#text":    ["The ", " over the ", "."],
			"em": [
				{"#text": "quick"},
				{"#text": "brown"},
				{"#text": "lazy"},
			],
			"mark":   {"#text": "jumps"},
			"strong": [
				{"#text": "fox"},
				{"#text": "dog"},
			],
		},
	}
	```

### More Examples

XML | JSON
--- | ----
`<e/>` | `{"e": {}}`
`<e name="value"/>` | `{"e": {"@name": "value"}}`
`<e>hello</e>` | `{"e": {"#text": "hello"}}`
`<e name="value">hello</e>` | `{"e": {"@name": "value", "#text": "hello"}}`
`<e> <a>hello</a> <b>world</b> </e>` | `{"e": {"#content": ["a", "b"], "a": {"#text": "hello"}, "b": {"#text": "world"}}}`
`<e> <c>hello</c> <c>world</c> </e>` | `{"e": {"#content": ["c/0", "c/1"], "c": [{"#text": "hello"}, {"#text": "world"}]}}`
`<e> hello <d>world</d> </e>` | `{"e": {"#content": ["#text/0", "d"], "#text": [" hello "], "d": {"#text": "world"}}}`

Here’s a big one:

```xml
<html lang="en">
<head>
	<title>An article.</title>
	<meta name="description" content="An article with a blockquote."/>
</head>
<body>
	<section id="first">
		<h1>The Title</h1>
		<p>The lede.</p>
		<hr/>
		<p>The intro text.</p>
	</section>
	<aside class="pull heavy">
		<figure>
			<blockquote cite="//example.com/">Something profound.</blockqote>
			<figcaption>This was said by <a href="//example.com/">someone</a>.</figcaption>
		</figure>
	</aside>
	<section id="second">
		End.
	</section>
</body>
</html>
```
```json
{
	"html": {
		"@lang": "en",
		"#content": ["head", "body"],
		"body": {
			"#content": ["section/0", "aside", "section/1"],
			"aside": {
				"@class": "pull heavy",
				"#content": ["figure"],
				"figure": {
					"#content": ["blockquote", "figcaption"],
					"blockquote": {
						"@cite": "//example.com/",
						"#text": "Something profound.",
					},
					"figcaption": {
						"#content": ["#text/0", "a", "#text/1"],
						"#text": ["This was said by ", "."],
						"a": {
							"@href": "//example.com/",
							"#text": "someone",
						},
					},
				},
			},
			"section": [
				{
					"@id": "first",
					"#content": ["h1", "p/0", "hr", "p/1"],
					"h1": {"#text": "The Title"},
					"hr": {},
					"p": [
						{"#text": "The lede."},
						{"#text": "The intro text."},
					],
				},
				{
					"@id": "second",
					"#text": "\n\t\tEnd.\n\t",
				},
			],
		},
		"head": {
			"#content": ["title", "meta"],
			"title": {"#text": "An article."},
			"meta": {"@name": "description", "@content": "An article with a blockquote."},
		},
	},
}
```



## JSON-to-XML
Now we will see the inverse algorithm, converting JSON to XML.
The XML-to-JSON algorithm above is designed specificaly to be invertible, that is,
given JSON data obtained from the algorithm, one is able to completely restruct the original XML data.
However, not all JSON data conforms to the section above. This section addresses those discrepancies.


### Summary
1. If the root JSON data is a primitive value (null/boolean/number/string),
	then assign the value to a property named `xml` and wrap it inside an object.
	Then continue these steps.
2. If the root JSON data is an array,
	then assign the value to a property named `_` and wrap it inside an object.
	Then continue these steps.
// 1. If the root JSON data is not a (keyed) object, that is, it’s a primitive value or an array,
// 	or if the root JSON object contains exactly zero properties, then wrap the JSON data.
2. The root XML element name is chosen by the first property key (in codepoint order) that begins with `[A-Za-z_:]`.
	If no such key exists, the element name is chosen by the first key (in codepoint order) without any restrictions.
// 3. If the value of the property determined in the previous step is an array,
// 	then assign that value to a property named `_`, and wrap it in a new property.
3. For all properties whose key begins with `[A-Za-z_:]`, the property represents one or more children XML elements
	whose names are the property key, sanitized and escaped.
	1. If the property value is `null` or an empty object `{}`, it represents a child XML element without attributes and without contents.
	2. If the property value is a boolean, number, or string, it represents a child XML element with only text content,
		which is that value, stringified in base 10, sanitized, and escaped.
	3. If the property value is an object, it represents a single child XML element, defined recursively.
	4. If the property value is an array, it represents an ordered sequence of children XML elements, defined recursively.
4. For all properties whose key begins with `@`, the property represents an attribute on the XML element.
	1. If the property key is exactly `@`, then the property is ignored. Else, continue.
	2. The attribute name is the property key, excluding the beginning `@`, sanitized, and escaped.
	3. If the property value is `null` or an empty object `{}`, it represents the attribute with no value,
		or equivalently, with a value that is the empty string `""`.
	4. If the property value is a boolean, number, or string, it represents the attribute whose string value
		is that value, stringified in base 10, sanitized, and escaped.
	5. If the property value is an object or an array, it represents the attribute whose string value
		is the serialization of that object or array.
5. For a property whose key is exactly `#text`, the property represents some form of text content in the parent XML element.
	1. If the property value is `null`, it represents no text content.
	2. If the property value is a boolean, number, or string, it represents text content
		that is that value, stringified in base 10, sanitized, and escaped.
		The XML element has no other children.
	3. If the property value is an object, it represents text content
		that is the serialization of that object.
		The XML element has no other children.
	4. If the property value is an array, it represents multiple text contents, defined recursively,
		and intermixed with child XML elements as specified in the next step.
6. For a property whose key is exactly `#content`, the propety represents an ordering of children of the element.
	1. If there is no `#text` property, or if the `#text` property is not an array, then the `#content` property is ignored.
	2. If the property value of `#content` is not an array, or if the `#content` array’s items are not all strings,
		then the order of children is the alphabetical (codepoint) order of properties representing elements followed by
		text content that is represented by the `#text` attribute (and if that attribute is an array, the serialization of that array).
	3. For any items of `#content` that are not in the form `ContentItem` described by the following EBNF,
		```
		Int         :::= [0-9]+;
		ElemName    :::= [A-Za-z_:] [A-Za-z0-9_:#x2d#x2e]*; // U+002D HYPHEN-MINUS "-" // U+002E FULL STOP "."
		ElementRef  :::= ElemName ("/" Int)?;
		TextRef     :::= "#text" "/" Int;
		ContentItem :::= ElementRef | TextRef;
		```
		ignore that item.
	4. The contents of the XML element are the concatenation of the contents represented by the items in `#content`, in that order.
7. All other properties are ignored.



## Remarks
This project builds off of
[Stefan Goessner’s *Converting Between XML and JSON* (2006)](https://www.xml.com/pub/a/2006/05/31/converting-between-xml-and-json.html)
with a few changes:

- Elements are *always* represented as objects, no matter their contents.
	All XML elements have the same basic shape, not different types based on their contents.

- Elements without attributes and content are empty objects `{}` instead of `null`.
	This is useful for when checking the “truthiness” of a property.
	```xml
	<root id="home"> <meta/> </root>
	```
	If we used `null` to represent the empy `meta` element,
	```json
	{"root": {"@id": "home", "meta": null}}
	```
	then `assert.ok(root.meta)` would fail. We would need to change it to `assert.ok(root.meta || root.meta === null)`
	By representing empty elements with a truthy value,
	```json
	{"root": {"@id": "home", "meta": {}}}
	```
	scripting becomes easier.

- Elements containing only text (and no attributes) are objects with a sole `#text` property, instead of a string.
	Given `<e> <a>hello</a> </e>`, the type of `e.a` is always ‘object’,
	regardless of what the `a` element contains. We don’t need to write checks such as
	```js
	if (typeof e.a === 'string') { doThis(); }
	else if (typeof e.a === 'object') { doThat(); }
	```

- The document order of XML children elements and text nodes is encoded in the `#content` property.
	This addresses the many good concerns that Goessner has about elements with “mixed content”
	(that is, elements whose children are elements intermixed with text).
	Using *only* the `#content` property, one can reconstruct the original XML element.
