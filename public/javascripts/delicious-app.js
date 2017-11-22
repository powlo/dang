import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

typeAhead($('.search'));
makeMap($('#map'));
autocomplete($('#address'), $('#lat'), $('#lng'));

//for every 'heart' on the page, bind a click event.
//NB $$ is document.querySelectorAll, $ is document.querySelector
const heartForms = $$('form.heart');

//note we use .on() with the list. How cool is that?!
heartForms.on('submit', ajaxHeart);