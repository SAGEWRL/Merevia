function textElement(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function money(value) {
  return `KSh ${Number(value).toLocaleString('en-KE')}`;
}

function addFact(container, label, value) {
  if (value === null || value === undefined || value === '') return;
  const row = document.createElement('div');
  row.append(textElement('dt', label), textElement('dd', String(value)));
  container.append(row);
}

async function loadProperty() {
  const slug = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');
  const status = document.querySelector('#property-detail-status');
  const detail = document.querySelector('#property-detail');
  try {
    const response = await fetch(`/api/properties/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'This property is no longer available.');
    const property = result.property;
    const rateResponse = await fetch('/api/packages');
    const rateData = await rateResponse.json();
    const packageRate = rateData.packages?.find((item) => item.type === property.accommodationType);

    document.title = `${property.name} | Marevia`;
    document.querySelector('#property-breadcrumb').textContent = property.name;
    document.querySelector('#property-detail-type').textContent = property.accommodationType;
    document.querySelector('#property-detail-name').textContent = property.name;
    document.querySelector('#property-detail-location').textContent = `${property.location} · Up to ${property.guestCapacity} guests`;
    document.querySelector('#property-detail-description').textContent = property.description || 'Contact Marevia for the property description and any further verified details.';

    const price = document.querySelector('#property-detail-price');
    if (property.priceConfirmed) {
      price.append(textElement('strong', money(property.dailyPriceKes)), textElement('span', 'per day · property rate confirmed'));
    } else if (packageRate) {
      price.append(textElement('strong', `${money(packageRate.minimumPriceKes)}–${money(packageRate.maximumPriceKes)}`), textElement('span', 'per day · confirm exact price'));
    } else {
      price.append(textElement('span', 'Price confirmed on enquiry'));
    }

    const facts = document.querySelector('#property-detail-facts');
    addFact(facts, 'Accommodation type', property.accommodationType);
    addFact(facts, 'Guest capacity', property.guestCapacity);
    addFact(facts, 'Bedrooms', property.bedrooms);
    addFact(facts, 'Bathrooms', property.bathrooms);
    addFact(facts, 'Availability', 'Confirm dates directly with Marevia');

    const amenities = document.querySelector('#property-detail-amenities');
    if (property.amenities?.length) {
      const list = amenities.querySelector('ul');
      property.amenities.forEach((amenity) => list.append(textElement('li', amenity)));
      amenities.hidden = false;
    }

    const gallery = document.querySelector('#property-gallery');
    if (property.photos?.length) {
      property.photos.forEach((photo, index) => {
        const image = document.createElement('img');
        image.src = photo;
        image.alt = `${property.name} photo ${index + 1}`;
        image.loading = index === 0 ? 'eager' : 'lazy';
        gallery.append(image);
      });
    } else {
      gallery.append(textElement('p', 'No approved property photos have been added yet.'));
    }

    const booking = document.querySelector('#property-booking-link');
    booking.href = `/booking?propertyId=${encodeURIComponent(property.id)}&location=${encodeURIComponent(property.location)}&type=${encodeURIComponent(property.accommodationType)}`;
    status.hidden = true;
    detail.hidden = false;
    window.lucide?.createIcons();
  } catch (error) {
    status.textContent = error.message;
    document.querySelector('#property-not-found').hidden = false;
  }
}

await loadProperty();