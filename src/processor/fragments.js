// @flow
import { FileSpec } from '../spec-generator';
import { GenericSpec } from '../spec-generator/generic-spec';
import { defaultImports } from '../utils';
import processFieldGroup from './fragment-processor';

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

	file.addRootSpec(processFieldGroup(fragments));
	return file;
};

export default process;
