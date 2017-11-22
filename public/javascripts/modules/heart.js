import axios from 'axios';
import { $ } from './bling';

//event handler. 'this' points to the element itself. Cool huh?
function ajaxHeart(e) {
  e.preventDefault();
  axios.post(this.action)
    .then(res => {
      const isHearted = this.heart.classList.toggle('heart__button--hearted');
      $('.heart-count').textContent = res.data.hearts.length;
      if (isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeout(() => {
          this.heart.classList.remove('heart__button--float');
        }, 2500);
      }
    })
    .catch(err => {console.log(err)});
}

export default ajaxHeart;