<template>
	<div>
		<div>Is Vue Component</div>
		<div>Timestamp: <b>{{ts}}</b></div>
		<div v-if="test">Prop: <b>{{test}}</b></div>
		<div>
			<a href="#" @click.prevent="dialog">Open dialog</a>
		</div>
		<div>Test</div>
		<div>Test</div>
		<div>
			<a href="#" @click.prevent="close">Close me</a>
		</div>
	</div>
</template>

<script>

import test from './test.vue'

export default {
	data() {
		return {
			ts: Date.now()
		}
	},
	props: ['test'],
	methods: {
		close() {
			this.$emit('close');
		},
		dialog() {
			console.log('Add dialog from test component.', this);
			this.$d.add(test, {
				c: 'fullpage',
				componentProps: {
					test: 'fullpage dialog'
				}
			});
		}
	}
}
</script>