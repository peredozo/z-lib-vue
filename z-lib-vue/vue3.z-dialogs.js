'use strict';

/* 
App:     z-dialogs (Vue.js 3)
Ver:     1.0
Desc:    Simple dialogs for Vue.js 3.
Author:  https://pdz.me
*/

import { h, reactive, markRaw, KeepAlive, Transition } from 'vue';

const dGroups = reactive({});

const dList = reactive([]);

let dLastId = 0;

const dNextId = () => {
	if(dLastId >= Number.MAX_SAFE_INTEGER) dLastId = 0;
	return ++dLastId;
}

const dClear = () => {
	dList.splice(0, dList.length);
}

const dDelX = (id) => {
	const findId = dList.findIndex(el => el.id == id);
	if(findId >= 0) {
		if(typeof dList[findId].onClosed == 'function') dList[findId].onClosed(dList[findId].id);
		dList.splice(findId, 1);
	}
}

const dDel = (id) => {
	const findId = dList.findIndex(el => el.id == id);
	if(findId >= 0) {
		dList[findId].deleted = true;
	}
}

const dAdd = (data, params) => {
	if(!data) return null;
	if(!params) params = {}
	if(typeof data == 'string') {
		params.html = data;
	}
	else if(data !== null && typeof data == 'object') {
		if(typeof data.render == 'function') {
			params.component = data;
		} else {
			Object.assign(params, data);
		}
	}
	else return null;
	if(!params.g) params.g = 'main';
	if(!(params.html || params.component) || !dGroups[params.g]) return null;
	const obj = {
		deleted: false,
		id: dNextId(),
		g: params.g,
		class: params.class || null,
		html: params.html || null,
		component: params.component ? markRaw(params.component) : null,
		componentProps: params.props || null,
		only: typeof params.only == 'boolean' ? params.only : dGroups[params.g].only,
		multi: typeof params.multi == 'boolean' ? params.multi : dGroups[params.g].multi,
		closer: typeof params.closer == 'boolean' ? params.closer : dGroups[params.g].closer,
		closerOutside: typeof params.closerOutside == 'boolean' ? params.closerOutside : dGroups[params.g].closerOutside,
		closerHTML: typeof params.closerHTML == 'string' ? params.closerHTML : dGroups[params.g].closerHTML,
		isText: typeof params.isText == 'boolean' ? params.isText : dGroups[params.g].isText,
		onClosed: params.onClosed || null
	}
	if(obj.closerOutside === null) obj.closerOutside = obj.closer;
	if(obj.only) {
		for(const el of dList) {
			if(el.g === obj.g) dDel(el.id);
		}
	}
	dList.push(obj);
	return obj.id;
}

export default {
	VUE3: {
		install(Vue, opt) {
			opt = Object.assign({
				name: 'z-dialogs',
				glob: 'd',
			}, opt || {});
			Vue.config.globalProperties['$' + opt.glob] = {
				add: dAdd,
				del: dDel,
				clear: dClear,
			}

			const DialogsItem = {
				emits: ['closed'],
				data: () => ({
					deleted: false,
					mouseClickStart: null
				}),
				props: {
					dialog: {
						type: Object
					}
				},
				methods: {
					bgmousedown(ev) {
						if(ev.button == 0) {
							this.mouseClickStart = {x: ev.x, y: ev.y}
						}
					},
					bgmouseup(ev) {
						if(ev.button == 0 && this.mouseClickStart && this.mouseClickStart.x == ev.x && this.mouseClickStart.y == ev.y) {
							this.del();
						}
						this.mouseClickStart = null;
					},
					del() {
						if(this.deleted) return;
						this.deleted = true;
						this.$emit('closed', this.dialog.id);
					}
				},
				render() {
					return h('div', Object.assign(
						{
							class: [opt.name + '-item', this.dialog.closer ? (opt.name + '-item-with-closer') : null, this.dialog.class || null],
						}, 
						this.dialog.closerOutside ? {
							onmousedown: this.bgmousedown,
							onmouseup: this.bgmouseup
						} : {}
					), [
						h('div', {
							class: opt.name + '-wrap',
						}, [
							h('div', {
								class: opt.name + '-dialog',
								onmousedown: (ev) => {
									ev.stopPropagation();
								}
							}, [
								this.dialog.component ? h('div', {
									class: opt.name + '-content'
								}, [
									h(this.dialog.component, Object.assign({
										onClose: () => this.del()
									}, this.dialog.componentProps || {}))
								]) : h('div', Object.assign({
									class: opt.name + '-content'
								}, this.dialog.isText ? {
									innerText: this.dialog.html
								} : {
									innerHTML: this.dialog.html
								})),
								this.dialog.closer ? h('div', {
									class: opt.name + '-closer',
									onclick: this.del,
									innerHTML: this.dialog.closerHTML
								}) : null,
							])
						])
					]);
				}
			}

			const Dialogs = {
				props: {
					g: {
						type: String,
						default: 'main'
					},
					only: { // close another dialogs in this group by adding new
						type: Boolean,
						default: false
					},
					multi: { // open new dialogs over previous without hide (by default show only last dialog and change to previous after close last)
						type: Boolean,
						default: false
					},
					bodyScroll: { // don't hide body scrollbars by any dialog in this group is opened
						type: Boolean,
						default: false
					},
					isText: { 
						type: Boolean,
						default: false
					},
					closer: {
						type: Boolean,
						default: true
					},
					closerOutside: {
						type: Boolean,
						default: null
					},
					closerHTML: {
						type: String,
						default: '<svg viewBox="0 0 386.667 386.667" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="m386.667 45.564-45.564-45.564-147.77 147.769-147.769-147.769-45.564 45.564 147.769 147.769-147.769 147.77 45.564 45.564 147.769-147.769 147.769 147.769 45.564-45.564-147.768-147.77z"/></svg>'
					}
				},
				computed: {
					items() {
						return dList.slice().filter(el => el.g == this.g);
					}
				},
				created() {
					dGroups[this.g] = Object.assign(dGroups[this.g] || {}, {
						only: this.only,
						multi: this.multi,
						isText: this.isText,
						closer: this.closer,
						closerOutside: this.closerOutside,
						closerHTML: this.closerHTML,
					});
				},
				watch: {
					items() {
						if(!this.bodyScroll) {
							if(this.items.length) {
								document.body.classList.add(opt.name + '-body-have-dialogs');
							} else {
								document.body.classList.remove(opt.name + '-body-have-dialogs');
							}
						}
					}
				},
				render() {
					return h('div', {
						class: opt.name,
					}, this.items.map((el, id) => {
						return h(Transition, {
							onLeave() {
								if(el.deleted) dDelX(el.id);
							},
							name: opt.name,
							appear: true,
						}, () => [
							h(KeepAlive, [
								!el.deleted && (this.multi || el.multi || id == this.items.length - 1) ? h(DialogsItem, {
									dialog: el,
									key: el.id,
									onClosed() { el.deleted = true; }
								}) : null
							])
						])
					}));
				}
			}
			Vue.component(opt.name, Dialogs);
		}
	}
}
