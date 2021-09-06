'use strict';

/* 
App:     z-dialogs (Vue.js 2)
Ver:     1.1
Desc:    Simple dialogs for Vue.js 2.
Author:  https://pdz.me
*/

const dialogs = {
	lastId: 0,
	items: [],
	groups: {},
	add(data, params) {
		if(!data) return null;
		if(!params) params = {}
		if(typeof data == 'string') {
			params.html = data;
		}
		else if(data.render && data._compiled) {
			params.component = data;
		}
		else if(typeof data == 'object') {
			Object.assign(params, data);
		}
		if(!params.g) params.g = 'main';
		if(!(params.html || params.component) || !this.groups[params.g]) return null;
		if(this.lastId >= Number.MAX_SAFE_INTEGER) this.lastId = 0;
		const obj = {
			id: ++this.lastId,
			g: params.g,
			c: params.class || params.c || null,
			html: params.html || null,
			component: params.component || null,
			componentProps: params.componentProps || params.props || null,
			only: typeof params.only == 'boolean' ? params.only : this.groups[params.g].only,
			multi: typeof params.multi == 'boolean' ? params.multi : this.groups[params.g].multi,
			closer: typeof params.closer == 'boolean' ? params.closer : this.groups[params.g].closer,
			closerOutside: typeof params.closerOutside == 'boolean' ? params.closerOutside : this.groups[params.g].closerOutside,
			isText: typeof params.isText == 'boolean' ? params.isText : this.groups[params.g].isText,
			on: typeof params.on == 'object' && Object.isExtensible(params.on) ? params.on : {}
		}
		if(obj.closerOutside === null) obj.closerOutside = obj.closer;
		if(obj.only) this.items = this.items.filter(el => el.g !== obj.g);
		this.items.push(obj);
		return obj.id;
	},
	del(id) {
		this.items = this.items.filter(el => el.id !== id);
	},
	clear() {
		this.items = [];
	}
}

const comp = {
	install(Vue, opt) {
		opt = Object.assign({
			name: 'z-dialogs',
			glob: 'd',
		}, opt || {});
		Vue.prototype['$' + opt.glob] = {
			add: dialogs.add.bind(dialogs),
			del: dialogs.del.bind(dialogs),
			clear: dialogs.clear.bind(dialogs)
		}
		const compos = {}
		compos[opt.name + '-item'] = {
			props: {
				component: {
				},
				componentProps: {
					type: Object,
					default: null
				},
				html: {},
				needClose: {
					type: Boolean,
					default: false
				},
				on: {
					type: Object,
					default: {}
				},
				isText: {
					type: Boolean,
					default: false
				},
				id: {
					type: Number
				},
				c: {
					type: String,
					default: null
				},
				only: {
					type: Boolean,
					default: false
				},
				multi: {
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
					type: String
				}
			},
			watch: {
				needClose() {
					this.del();
				}
			},
			methods: {
				del() {
					if(this.on && typeof this.on.closed == 'function') this.on.closed(this.id);
					this.$emit('closed', this.id);
				}
			},
			data() {
				return {
					mouseClickStart: null
				}
			},
			render(h) {
				const css = [opt.name + '-item'];
				if(this.closer) css.push(opt.name + '-item-with-closer');
				if(this.c) css.push(this.c);
				return h('div', {
					class: css,
					on: this.closerOutside ? {
						mousedown: (ev) => {
							// ev.stopPropagation();
							if(ev.button == 0) {
								this.mouseClickStart = {x: ev.x, y: ev.y}
							}
						},
						mouseup: (ev) => {
							if(ev.button == 0 && this.mouseClickStart && this.mouseClickStart.x == ev.x && this.mouseClickStart.y == ev.y) {
								// ev.stopPropagation();
								this.del();
							}
							this.mouseClickStart = null;
						}
					} : {}
				}, [
					h('div', {
						class: opt.name + '-wrap',
					}, [
						h('div', {
							class: opt.name + '-dialog',
							on: {
								mousedown: (ev) => {
									ev.stopPropagation();
								}
							}
						}, [
							this.component
							? h('div', {
								class: opt.name + '-content'
							}, [
								h(this.component, {
									props: this.componentProps || {},
									on: Object.assign({}, this.on || {}, {
										close: (e) => {
											this.del(e);
											if(this.on.close) this.on.close(e);
										}
									})
								})
							])
							: h('div', {
								class: opt.name + '-content',
								domProps: this.isText ? {
									innerText: this.html
								} : {
									innerHTML: this.html
								}
							}),
							this.closer ? h('div', {
								class: opt.name + '-closer',
								on: {
									click: this.del
								},
								domProps: {
									innerHTML: this.closerHTML
								}
							}) : null,
						])
					])
				])
			}
		}
		Vue.component(opt.name, {
			components: compos,
			data() {
				return {
					dialogs
				}
			},
			props: {
				g: { // group
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
				closer: { // show close button
					type: Boolean,
					default: true
				},
				closerOutside: { // close by click to overlay
					type: Boolean,
					default: null
				},
				isText: { // parse content as plain text (default is html)
					type: Boolean,
					default: false
				},
				bodyScroll: { // don't hide body scrollbars by any dialog in this group is opened
					type: Boolean,
					default: false
				},
				closerHTML: { // close button content
					type: String,
					default: '<svg viewBox="0 0 386.667 386.667" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="m386.667 45.564-45.564-45.564-147.77 147.769-147.769-147.769-45.564 45.564 147.769 147.769-147.769 147.77 45.564 45.564 147.769-147.769 147.769 147.769 45.564-45.564-147.768-147.77z"/></svg>'
				}
			},
			computed: {
				itms() {
					return this.dialogs.items.slice().filter(el => el.g == this.g);
				}
			},
			methods: {
				del(id) {
					this.dialogs.del(id);
				}
			},
			created() {
				this.dialogs.groups[this.g] = Object.assign(this.dialogs.groups[this.g] || {}, {
					only: this.only,
					closer: this.closer,
					closerOutside: this.closerOutside,
					isText: this.isText
				});
			},
			watch: {
				itms() {
					if(!this.bodyScroll) {
						if(this.itms.length) {
							document.body.classList.add(opt.name + '-body-have-dialogs');
						} else {
							document.body.classList.remove(opt.name + '-body-have-dialogs');
						}
					}
				}
			},
			render(h) {
				return h('div', {
					class: opt.name,
				}, this.itms.map((el, id) => {
					return h('transition', {
						props: {
							name: opt.name
						},
					}, [
						h('keep-alive', [
							this.dialogs.multi || el.multi || id == this.itms.length-1 ? h(opt.name + '-item', {
								props: Object.assign({
									closerHTML: this.closerHTML
								}, el),
								key: el.id,
								on: {
									closed: this.del
								}
							})
						: null])
					])
				}));
			}
		});
	}
}

export default comp;
