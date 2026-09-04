const CENTIMETRES_PER_INCH = 2.54;
const KILOGRAMS_PER_POUND = 0.45359237;

export function cmToInches(centimetres: number): number {
  return centimetres / CENTIMETRES_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CENTIMETRES_PER_INCH;
}

export function kgToPounds(kilograms: number): number {
  return kilograms / KILOGRAMS_PER_POUND;
}
