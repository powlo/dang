function autocomplete (addressInput, latInput, lngInput){

  if(!addressInput) return;

  //apply google magic to the given input
  const dropdown = new google.maps.places.Autocomplete(addressInput);

  //when the address input changes, populate lat lng.
  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace();
    lat.value = place.geometry.location.lat();
    lng.value = place.geometry.location.lng();
  })

  //prevent default behaviour (form submit) for address input
  addressInput.on('keydown', (e) => {
    if(e.keyCode === 13) e.preventDefault();
  });

}

export default autocomplete;