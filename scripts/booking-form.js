export function validateEnquiry(values) {
  const errors = {};
  const requiredFields = [
    ['enquiryType', 'Choose an enquiry type.'],
    ['destination', 'Enter a destination or stay area.'],
    ['arrivalDate', 'Choose an arrival date.'],
    ['departureDate', 'Choose a departure date.'],
    ['name', 'Enter your name.'],
    ['contact', 'Enter a preferred contact detail.'],
  ];

  for (const [field, message] of requiredFields) {
    if (!String(values[field] ?? '').trim()) errors[field] = message;
  }

  const partySize = Number(values.partySize);
  if (!String(values.partySize ?? '').trim()) {
    errors.partySize = 'Enter the number of people.';
  } else if (!Number.isInteger(partySize) || partySize < 1) {
    errors.partySize = 'Enter a whole number greater than zero.';
  }

  if (values.arrivalDate && values.departureDate) {
    const arrival = Date.parse(`${values.arrivalDate}T00:00:00Z`);
    const departure = Date.parse(`${values.departureDate}T00:00:00Z`);
    if (Number.isNaN(arrival)) errors.arrivalDate = 'Choose a valid arrival date.';
    if (Number.isNaN(departure)) errors.departureDate = 'Choose a valid departure date.';
    else if (!Number.isNaN(arrival) && departure <= arrival) {
      errors.departureDate = 'Departure must be after arrival.';
    }
  }

  const enquiryTypes = [
    'Tours and travel',
    'Wildlife safaris',
    'Nature trails',
    'Hotel reservation',
    'Airbnb booking',
    'Ticketing',
    'Airport transfer',
    'Other transport',
    'Travel',
    'Accommodation',
  ];
  if (values.enquiryType && !enquiryTypes.includes(values.enquiryType)) {
    errors.enquiryType = 'Choose one of the listed services.';
  }

  return errors;
}

export function buildWhatsAppUrl(values, phoneNumber) {
  const digits = String(phoneNumber).replace(/\D/g, '');
  const internationalNumber = digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
  const message = [
    'Hello Bjlive Travels and Bookings, I would like to enquire about:',
    `Service: ${values.enquiryType}`,
    `Destination or stay area: ${values.destination}`,
    `Travel dates: ${values.arrivalDate} to ${values.departureDate}`,
    `Number of guests: ${values.partySize}`,
    `Name: ${values.name}`,
    `Preferred contact: ${values.contact}`,
    values.notes ? `Additional details: ${values.notes}` : '',
  ].filter(Boolean).join('\n');

  return `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}`;
}

const form = typeof document === 'undefined' ? null : document.querySelector('#enquiry-form');

if (form) {
  const alert = document.querySelector('#form-alert');
  const reviewButton = document.querySelector('#review-button');
  const result = document.querySelector('#draft-result');
  const details = document.querySelector('#draft-details');
  const labels = {
    enquiryType: 'Enquiry type',
    destination: 'Destination or stay area',
    partySize: 'Number of guests',
    arrivalDate: 'Arrival date',
    departureDate: 'Departure date',
    name: 'Name',
    contact: 'Preferred contact detail',
    whatsappNumber: 'WhatsApp number',
    notes: 'Additional notes',
  };

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach((message) => { message.textContent = ''; });
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
    alert.hidden = true;
    alert.textContent = '';
  }

  form.addEventListener('input', clearErrors);
  form.addEventListener('change', clearErrors);

  form.addEventListener('reset', () => {
    clearErrors();
    result.hidden = true;
    document.querySelector('.booking-layout').hidden = false;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    const values = Object.fromEntries(new FormData(form).entries());
    const errors = validateEnquiry(values);

    if (Object.keys(errors).length) {
      for (const [fieldName, message] of Object.entries(errors)) {
        const field = form.elements.namedItem(fieldName);
        const messageElement = form.querySelector(`[data-error-for="${fieldName}"]`);
        field?.setAttribute('aria-invalid', 'true');
        if (messageElement) messageElement.textContent = message;
      }
      alert.textContent = 'Check the highlighted fields to review your enquiry.';
      alert.hidden = false;
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    reviewButton.disabled = true;
    reviewButton.innerHTML = '<span class="loading-indicator" aria-hidden="true"></span> Preparing draft';
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    details.replaceChildren();
    for (const [key, label] of Object.entries(labels)) {
      if (['notes', 'whatsappNumber'].includes(key) && !String(values[key] ?? '').trim()) continue;
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = values[key] || 'Not provided';
      row.append(term, description);
      details.append(row);
    }

    document.querySelector('.booking-layout').hidden = true;
    result.hidden = false;
    const whatsappLink = document.querySelector('#whatsapp-link');
    if (whatsappLink) {
      whatsappLink.href = buildWhatsAppUrl(values, values.whatsappNumber || '0735 109 066');
    }
    reviewButton.disabled = false;
    reviewButton.innerHTML = 'Review enquiry <i data-lucide="arrow-right" aria-hidden="true"></i>';
    window.lucide?.createIcons();
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelector('#edit-button').addEventListener('click', () => {
    result.hidden = true;
    document.querySelector('.booking-layout').hidden = false;
    form.elements.namedItem('destination').focus();
  });
}