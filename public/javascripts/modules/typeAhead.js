import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML (stores) {
  return stores.map(store => {
    return `
    <a href="/store/${store.slug}" class="search__result">
      <strong>${store.name}</strong>
    </a>
    `
  }).join('')
}

function typeAhead(search) {

  //if search isn't on page then quit
  if (!search) return;

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function(){
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }
    searchResults.style.display = 'block';

    axios.get(`/api/search?q=${this.value}`)
    .then(res => {
      if (res.data.length){
        //santize prevents users inserting onload, onerror XSS hacks.
        searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
        return;
      }
      searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results found for "${this.value}".</div>`)
    })
    .catch(err => {
      console.errror(err);
    });
  });

  searchInput.on('keyup', e => {
    //40 = arrow down, 38 = arrow up, 13 = enter key
    if (![38, 40, 13].includes(e.keyCode)) return;
    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll(`.search__result`);
    let next;
    if (e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0]; //wrap if no next
    }
    else if (e.keyCode === 40) {
      next = items[0];
    }
    else if (e.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length-1];
    }
    else if (e.keyCode === 38) {
      next = items[item.length-1];
    }
    else if (e.keyCode === 13 && current.href) {
      window.location = current.href;
      return;
    }
    if (current) current.classList.remove(activeClass);
    next.classList.add(activeClass);
  });
}


//module.exports is a node thing
//export is an es6 thing
export default typeAhead;