// @flow

import { ClassSpec, PropertySpec, InterfaceSpec, RootSpec } from '../spec-generator';
import { className, adjustType } from '../utils';
import { camelCase } from 'lodash';

const FragmentsContainer = 'Fragments';
const defaultImpl = (ifaceName: string) => `${ifaceName}DefaultImpl`;
const fragmentPath = (fragmentName: string) => `${FragmentsContainer}.${fragmentName}`;
const fragmentDefaultImplPath = (fragmentName: string) => `${fragmentPath(fragmentName)}.${defaultImpl(fragmentName)}`;
const wrapperPath = (name: string) => `${name}.${wrapperName(name)}`;
const wrapperName = (name: string) => `${name}Wrapper`;
const asPropertyName = (name: string) => camelCase(name);
const FragmentsWrapper = 'FragmentsWrapper';
const wrappedPropertyName = () => 'delegate';
const FragmentsProperty = 'fragments';

// eslint-disable-next-line no-undef
const process = (fragments: any) => {
	const root = new InterfaceSpec(FragmentsContainer);
	const fragmentSpecs = fragments.map(fragment => {
		const spec = new InterfaceSpec(fragment.fragmentName).containedBy(root);
		const properties = fieldsToProperties(fragment.fields);
		spec.addProperties(properties);

		// const default implementation
		const implSpec = new ClassSpec(defaultImpl(fragment.fragmentName))
			.implementsInterface(spec)
			.containedBy(spec)
			.setSerializable(true)
			.setDataClass(true)
			.addProperties(fieldsToProperties(fragment.fields));

		if (fragment.fragmentSpreads.length || fragment.inlineFragments.length) {
			spec.setSerializer(`${wrapperPath(fragment.fragmentName)}.Companion::class`);
		}

		return spec;
	});

	fragments.forEach((fragment, index) => {
		const complexFields = fragment.fields.filter(field => !!field.fields);
		const containerSpec = fragmentSpecs[index];
		complexFields.forEach(fieldGroup => processFieldGroup(fieldGroup, containerSpec));
	});

	return root;
};

const processFieldGroup = (fieldGroup: any, containerSpec: RootSpec) => {
	const { inlineFragments = [], fragmentSpreads = [], fields = [], type } = fieldGroup;
	const specName = className(type);
	const hasFragments = inlineFragments.length || fragmentSpreads.length;
	let spec;
	if (!hasFragments) {
		spec = new ClassSpec(specName)
			.setDataClass(true)
			.setSerializable(true)
			.containedBy(containerSpec);
		const properties = fieldsToProperties(fields);
		spec.addProperties(properties);
	} else {
		// create the interface
		spec = new InterfaceSpec(specName).setSerializer(`${wrapperPath(specName)}.Companion::class`).containedBy(containerSpec);
		const properties = fieldsToProperties(fields);
		spec.addProperties(properties);

		// create ref impl of the interface
		const implSpec = new ClassSpec(defaultImpl(specName))
			.implementsInterface(spec)
			.setDataClass(true)
			.setSerializable(true)
			.containedBy(spec)
			.addProperties(fieldsToProperties(fields));

		// create the wrapper
		const wrapperSpec = new ClassSpec(wrapperName(specName))
			.containedBy(spec)
			.setDataClass(true)
			.setSerializable(true)
			.setCustomSerializer(
				`
				companion object: KSerializer<${specName}> {
					override val descriptor: SerialDescriptor = StringDescriptor.withName("${specName}Serializer")

					override fun deserialize(decoder: Decoder): ${specName} {
							val json = (decoder as JsonInput).decodeJson()
							val ${wrappedPropertyName()} = Json.nonstrict.fromJson(${defaultImpl(specName)}.serializer(), json)
							${fragmentSpreads
		.map(fragmentName => {
			return `val ${asPropertyName(fragmentName)} = Json.nonstrict.fromJsonOrNull(${fragmentDefaultImplPath(fragmentName)}.serializer(), json)`;
		})
		.join('\n')}
							
							return ${wrapperName(specName)}(${wrappedPropertyName()}, ${FragmentsWrapper}(${fragmentSpreads.map(f => asPropertyName(f)).join(', ')}))
					}

					override fun serialize(encoder: Encoder, obj: ${specName}) {
						val ${wrappedPropertyName()} = obj as ${wrapperName(specName)}
						val jsonObjects = listOfNotNull(
								Json.nonstrict.toJson(${defaultImpl(specName)}.serializer(), ${wrappedPropertyName()}.${wrappedPropertyName()} as ${defaultImpl(specName)}).jsonObject,
								${fragmentSpreads
		.map(fragmentName => {
			return `if (${wrappedPropertyName()}.${FragmentsProperty}.${asPropertyName(fragmentName)} != null) Json.nonstrict.toJson(
										${fragmentDefaultImplPath(fragmentName)}.serializer(),
										${wrappedPropertyName()}.${FragmentsProperty}.${asPropertyName(fragmentName)} as ${fragmentDefaultImplPath(fragmentName)}
								).jsonObject else null`;
		})
		.join(',\n')}
						)


						val jsonMap = mutableMapOf<String, JsonElement>()
						for (json in jsonObjects) {
								val jsonObject = json.jsonObject
								for (key in jsonObject.keys) {
									jsonMap[key] = jsonObject[key]!!
								}
						}
						(encoder as JsonOutput).encodeJson(JsonObject(jsonMap))
					}

			}
				`
			);
		const wrappedProperty = new PropertySpec(wrappedPropertyName())
			.ofType(specName)
			.isIncludedInConstructor(true)
			.setAccessModifier('private');
		wrapperSpec.addProperty(wrappedProperty).implementsInterfaceBy(spec, wrappedProperty);

		// create fragments spec
		const fragmentsWrapperSpec = new ClassSpec(FragmentsWrapper)
			.setDataClass(true)
			.setSerializable(true)
			.containedBy(spec);
		fragmentSpreads.forEach(fragmentName => {
			fragmentsWrapperSpec.addProperty(new PropertySpec(asPropertyName(fragmentName)).ofType(`${fragmentPath(fragmentName)}? = null`).isIncludedInConstructor(true));
		});

		wrapperSpec.addProperty(new PropertySpec(FragmentsProperty).ofType(`${FragmentsWrapper} = ${FragmentsWrapper}()`));
	}
	const complexFields = fieldGroup.fields.filter(field => !!field.fields);
	complexFields.forEach(fieldGroup => processFieldGroup(fieldGroup, spec));
};

const fieldsToProperties = (fields: any[]) => {
	return fields.map(field => new PropertySpec(field.responseName).ofType(adjustType(field.type)));
};

export default process;
