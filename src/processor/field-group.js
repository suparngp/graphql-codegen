// @flow

import { ClassSpec, PropertySpec, InterfaceSpec, RootSpec } from '../spec-generator';
import { className, adjustType } from '../utils';

const process = (parentSpec: RootSpec, fieldGroup: any, name: string, fragmentMap: {[string]: RootSpec}, isExtendable: boolean = true, isDataClass: boolean = false, skipFragments: boolean = false) => {
	const { fields, inlineFragments = [], fragmentSpreads = [] } = fieldGroup;
	const properties = fields
		.map(({responseName, fieldName, type}) => 
			new PropertySpec(responseName || fieldName)
				.ofType(adjustType(type)));
	const hasFragments = (inlineFragments.length || fragmentSpreads.length);
	const groupSpec = (hasFragments
		? new InterfaceSpec(name) 
		: new ClassSpec(name)
			.isExtendable(isExtendable)
			.setDataClass(isDataClass))
		.containedBy(parentSpec)
		.setSerializable(true)
		.setStable(false)
		.addProperties(properties);
	
	if (hasFragments) {
		groupSpec.setSerializer(`${name}.Companion::class`);
	}
		
	fields.filter(field => !!field.fields).forEach(field => {
		const child = process(hasFragments ? parentSpec : groupSpec, field, className(field.type), fragmentMap, isExtendable, isDataClass, skipFragments);
		if (!child.container) {
			child.containedBy(groupSpec);
		}
	});
	if (skipFragments) {
		return groupSpec;
	}
	
	const subtypes = [];
	
	fragmentSpreads
		.filter(key => !parentSpec.children[className(key)])
		.map(key => fragmentMap[key])
		.forEach(fragment => {
			const spec = new ClassSpec(className(fragment.name))
				.extendsClass(fragment)
				.implementsInterface(groupSpec)
				.containedBy(parentSpec)
				.setSerializable(true)
				.setStable(false);
			subtypes.push(spec);
		});
  
	// process inline fragments
	inlineFragments.forEach(fragment => {
		const spec = process(parentSpec, fragment, fragment.typeCondition, fragmentMap, isExtendable, isDataClass, skipFragments)
			.implementsInterface(groupSpec)
			.containedBy(parentSpec);
		subtypes.push(spec);
	});
	if (hasFragments) {
		groupSpec.addSubtypes(subtypes);
	}
	
	return groupSpec;
};



export default process;