// @flow
import { FileSpec, ClassSpec } from '../spec-generator';

import processFieldGroup from './fragment-processor';
import { defaultImports } from '../utils';
import { GenericSpec } from '../spec-generator/generic-spec';

const process = (input: any) => {
	const { fragments } = input;
	const file = new FileSpec('Fragments.kt')
		.inSourceDir(`${__dirname}/../out`)
		.withImports([...defaultImports, 'import kotlinx.serialization.MissingFieldException', 'import kotlinx.serialization.json.JsonElement', 'import kotlinx.serialization.json.JsonObject'])
		.inPackage('com.suparnatural')
		.addGenericSpec(
			new GenericSpec().setContent(
				`
			fun <T>Json.fromJsonOrNull(deserializer: KSerializer<T>, json: JsonElement): T? {
				return try { this.fromJson(deserializer, json) } catch (e: MissingFieldException) { null }
			}
			`
			)
		);

	// let fragmentsSpec = new ClassSpec('Fragments');
	// const pureFragments = fragments.map(fragment => processFieldGroup(fragmentsSpec, fragment, fragment.fragmentName, {}, true, false, true, true));
	// const fragmentMap = pureFragments.reduce((prev, next) => {
	// 	prev[next.name] = next;
	// 	return prev;
	// }, {});

	// fragmentsSpec = new ClassSpec('Fragments');
	// fragments.map(fragment => processFieldGroup(fragmentsSpec, fragment, fragment.fragmentName, fragmentMap, true, false, false, true));
	file.addRootSpec(processFieldGroup(fragments));
	return file;
};

export default process;
