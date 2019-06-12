// @flow
// export type RootSpec = ClassSpec | InterfaceSpec;
import input from '../input.json';

// eslint-disable-next-line no-undef
export type Input = $Shape<input>;
export type AccessModifier = 'private' | 'public';
