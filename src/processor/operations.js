// @flow
import type {RootSpec} from '../spec-generator';
import { FileSpec, ClassSpec, PropertySpec } from '../spec-generator';
import { upperFirst, camelCase } from 'lodash';
import { adjustType, defaultImports } from '../utils';
import processFieldGroups from './field-group';

const process = (input: any, fragmentsMap: {[string]: RootSpec}) => {

	const { operations } = input;
	const file = new FileSpec('Operations.kt')
		.inPackage('com.suparnatural')
		.withImports(defaultImports)
		.inSourceDir(`${__dirname}/../out`);
	const operationSpecs: ClassSpec[] = operations.map(operation => {
		const {operationName, operationType } = operation;
		const name = upperFirst(camelCase(`${operationName}_${operationType}`));
		const operationSpec = new ClassSpec(name)
			.setSerializable(true)
			.extendsClass(`GraphQLOperation<${name}>()`)
			.addProperty(new PropertySpec('serializer')
				.isOverridden(true)
				.isIncludedInConstructor(false)
				.setValue('Companion.serializer()')
			);
		// .addProperty(
		// 	new PropertySpec('query')
		// 		.ofType('String')
		// 		.setValue(operation.sourceWithFragments.replace(/[$]/gi, '${"$"}')) 
		// 		.isIncludedInConstructor(false)
		// );
		if (operation.variables && operation.variables.length) {
			const variables = operation.variables
				.map(({name, type}) => new PropertySpec(name).ofType(adjustType(type)));
			new ClassSpec('Variables')
				.setDataClass(true)
				.setSerializable(true)
				.addProperties(variables)
				.containedBy(operationSpec);
			operationSpec.addProperty(new PropertySpec('variables').ofType('Variables'));
		}
		processFieldGroups(operationSpec, operation, 'Data', fragmentsMap, false, true);
		new ClassSpec('OperationResult')
			.setDataClass(true)
			.setStable(false)
			.setSerializable(true)
			.containedBy(operationSpec)
			.addProperty(
				new PropertySpec('data')
					.ofType('Data')
					.isVariable(false)
			);
			
		return operationSpec;
	});

	file.addRootSpecs(operationSpecs);
	return file;
}; 

export default process;