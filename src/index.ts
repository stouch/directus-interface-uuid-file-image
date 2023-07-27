import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'uuid-file-image',
	name: 'UUID File Image',
	icon: 'box',
	description: 'Select image from Library in a UUID string field',
	component: InterfaceComponent,
	options: null,
	types: ['uuid'],
});
