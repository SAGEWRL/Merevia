export const LOCATIONS = Object.freeze(['Mombasa', 'Diani', 'Malindi', 'Kisumu']);

export const ACCOMMODATION_TYPES = Object.freeze([
  Object.freeze({ type: 'Single room', startingPriceKes: 2000, minimumPriceKes: 2000, maximumPriceKes: 4000 }),
  Object.freeze({ type: 'Double room', startingPriceKes: 2500, minimumPriceKes: 2500, maximumPriceKes: 5000 }),
  Object.freeze({ type: 'BnB studio', startingPriceKes: 3000, minimumPriceKes: 3000, maximumPriceKes: 5000 }),
  Object.freeze({ type: 'One-bedroom accommodation', startingPriceKes: 4000, minimumPriceKes: 4000, maximumPriceKes: 5000 }),
  Object.freeze({ type: 'Two-bedroom accommodation', startingPriceKes: 8000, minimumPriceKes: 8000, maximumPriceKes: 10000 }),
]);

export async function getAccommodationTypes(database) {
  const overrides = new Map(
    (await database.prepare('SELECT * FROM package_prices').all()).map((row) => [row.accommodation_type, row]),
  );

  return ACCOMMODATION_TYPES.map((packageRate) => {
    const override = overrides.get(packageRate.type);
    return override
      ? {
          type: packageRate.type,
          startingPriceKes: override.starting_price_kes,
          minimumPriceKes: override.minimum_price_kes,
          maximumPriceKes: override.maximum_price_kes,
          unit: 'per day',
        }
      : { ...packageRate, unit: 'per day' };
  });
}

export async function getAccommodationType(type, database) {
  return (await getAccommodationTypes(database)).find((packageRate) => packageRate.type === type) ?? null;
}