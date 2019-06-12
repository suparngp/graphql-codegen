import { camelCase, upperFirst } from 'lodash';
const adjustType = type => {
	let adjustedType;

	// list
	if (type.startsWith('[')) {
		adjustedType = `List<${adjustType(type.replace(/[\[\]]/gi, ''))}>`;
	} else if (type.endsWith('!')) {
		adjustedType = type.substring(0, type.length - 1);
	} else {
		adjustedType = `${type}?`;
	}
	return adjustedType;
};

const stripedType = type => {
	return adjustType(type.replace(/[[\]]/gi, ''));
};

const className = type => {
	return upperFirst(camelCase(stripedType(type).replace(/[\[\]\?\!]/gi, '')));
};

const buildClass = (node, classKey, propertyNameKey, propertyTypeKey) => {
	const header = node.fields.map(field => {
		return `var ${field[propertyNameKey]}: ${adjustType(field[propertyTypeKey])}`;
	});
	return `class ${className(node[classKey])}(\n\t${header.join(',\n\t')}\n)`;
};

const processField = (field, classKey, propertyKey, propertyTypeKey) => {
	var lines = [];
	if (field.fields) {
		lines.push(`${buildClass(field, classKey, propertyKey, propertyTypeKey)} {`);
		const subfields = field.fields.filter(f => !!f.fields);
		subfields.forEach(subfield => {
			lines.push(processField(subfield, classKey, propertyKey, propertyTypeKey));
		});
		lines.push('}');
	}
	return lines.filter(Boolean).join('\n');
};

const prefixCount = (input: string, prefix: string) => {
	let counter = 0;
	let index = 0;
	while (input[index] === prefix) {
		counter++;
		index++;
	}
	return counter;
};

const defaultImports = [
	'import kotlinx.serialization.Serializable',
	'import kotlinx.serialization.KSerializer',
	'import kotlinx.serialization.SerialDescriptor',
	'import kotlinx.serialization.UnstableDefault',
	'import kotlinx.serialization.Decoder',
	'import kotlinx.serialization.Encoder',
	'import kotlinx.serialization.withName',
	'import kotlinx.serialization.json.Json',
	'import kotlinx.serialization.json.JsonLiteral',
	'import kotlinx.serialization.json.JsonInput',
	'import kotlinx.serialization.json.JsonOutput',
	'import kotlinx.serialization.internal.StringDescriptor'
];

export { adjustType, stripedType, className, buildClass, processField, prefixCount, defaultImports };
