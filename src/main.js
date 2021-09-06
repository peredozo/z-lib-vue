import Vue from 'vue'
import App from './App.vue'

// connect z-ws

import zWs from '../z-lib-vue/z-ws.js';
Vue.use(zWs, {
	glob: 'ws' // global instance method name (this.$ws)
});

// connect z-notices

import zNotices from '../z-lib-vue/z-notices.js';
Vue.use(zNotices, {
	glob: 'n', // global instance method name (this.$n),
	name: 'z-notices' // element name in templates <z-notices/>
});

// connect z-dialogs

import zDialogs from '../z-lib-vue/z-dialogs.js';
Vue.use(zDialogs, {
	glob: 'd', // global instance method name (this.$d),
	name: 'z-dialogs' // element name in templates <z-dialogs/>
});

// connect z-copy

import zCopy from '../z-lib-vue/z-copy.js';
Vue.use(zCopy, {
	glob: 'copy', // global instance method name (this.$copy),
});

// ...

Vue.config.productionTip = false

new Vue({
	render: h => h(App),
}).$mount('#app')
