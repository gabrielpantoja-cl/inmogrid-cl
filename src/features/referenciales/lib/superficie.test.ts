import { describe, it, expect } from '@jest/globals';
import { getSuperficieRelevante, valorUnitario } from './superficie';
import { tipoSuperficiePrimaria } from './destino';

describe('tipoSuperficiePrimaria', () => {
  it('clasifica destinos de terreno', () => {
    expect(tipoSuperficiePrimaria('W')).toBe('terreno');
    expect(tipoSuperficiePrimaria('A')).toBe('terreno');
    expect(tipoSuperficiePrimaria('B')).toBe('terreno');
    expect(tipoSuperficiePrimaria('F')).toBe('terreno');
  });

  it('clasifica destinos horizontales como construida', () => {
    expect(tipoSuperficiePrimaria('Z')).toBe('construida');
    expect(tipoSuperficiePrimaria('L')).toBe('construida');
    expect(tipoSuperficiePrimaria('O')).toBe('construida');
    expect(tipoSuperficiePrimaria('C')).toBe('construida');
    expect(tipoSuperficiePrimaria('I')).toBe('construida');
  });

  it('clasifica H como mixto', () => {
    expect(tipoSuperficiePrimaria('H')).toBe('mixto');
  });

  it('null/undefined/desconocido devuelve desconocido', () => {
    expect(tipoSuperficiePrimaria(null)).toBe('desconocido');
    expect(tipoSuperficiePrimaria(undefined)).toBe('desconocido');
    expect(tipoSuperficiePrimaria('X')).toBe('desconocido');
    expect(tipoSuperficiePrimaria('V')).toBe('desconocido');
  });

  it('es case-insensitive', () => {
    expect(tipoSuperficiePrimaria('w')).toBe('terreno');
    expect(tipoSuperficiePrimaria('h')).toBe('mixto');
  });
});

describe('getSuperficieRelevante', () => {
  it('terreno-priority cuando destino es W', () => {
    const r = { destino: 'W', superficieTerreno: 5000, superficieConstruida: undefined };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: 5000, fuente: 'terreno', confianza: 'alta',
    });
  });

  it('construida-priority cuando destino es Z (estacionamiento)', () => {
    const r = { destino: 'Z', superficieTerreno: undefined, superficieConstruida: 12 };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: 12, fuente: 'construida', confianza: 'alta',
    });
  });

  it('H con ambos: prefiere terreno (casa)', () => {
    const r = { destino: 'H', superficieTerreno: 322, superficieConstruida: 80 };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: 322, fuente: 'terreno', confianza: 'alta',
    });
  });

  it('H sólo construida: usa construida (depto)', () => {
    const r = { destino: 'H', superficieTerreno: undefined, superficieConstruida: 65 };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: 65, fuente: 'construida', confianza: 'alta',
    });
  });

  it('destino W sin superficieTerreno: devuelve null (sin fallback)', () => {
    const r = { destino: 'W', superficieTerreno: undefined, superficieConstruida: undefined };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: null, fuente: null, confianza: 'fallback',
    });
  });

  it('destino undefined: devuelve null', () => {
    const r = { destino: undefined, superficieTerreno: undefined, superficieConstruida: undefined };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: null, fuente: null, confianza: 'fallback',
    });
  });

  it('todo undefined: devuelve null', () => {
    const r = { destino: undefined, superficieTerreno: undefined, superficieConstruida: undefined };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: null, fuente: null, confianza: 'fallback',
    });
  });

  it('destino desconocido (V) con split: devuelve null (no hay regla)', () => {
    const r = { destino: 'V', superficieTerreno: 200, superficieConstruida: 80 };
    expect(getSuperficieRelevante(r)).toEqual({
      valor: null, fuente: null, confianza: 'fallback',
    });
  });
});

describe('valorUnitario', () => {
  it('calcula UF/m² terreno para destino W', () => {
    const r = {
      destino: 'W',
      superficieTerreno: 1000, superficieConstruida: undefined,
      monto: '$100.000.000', montoRaw: '100000000', montoUf: 2500,
    };
    const result = valorUnitario(r);
    expect(result).not.toBeNull();
    expect(result!.tipo).toBe('UF/m² terreno');
    expect(result!.uf).toBe(2.5);
    expect(result!.clp).toBe(100_000);
    expect(result!.fuente).toBe('terreno');
  });

  it('calcula UF/m² construido para destino Z', () => {
    const r = {
      destino: 'Z',
      superficieTerreno: undefined, superficieConstruida: 12,
      monto: '$12.000.000', montoRaw: '12000000', montoUf: 300,
    };
    const result = valorUnitario(r);
    expect(result!.tipo).toBe('UF/m² construido');
    expect(result!.uf).toBe(25);
    expect(result!.clp).toBe(1_000_000);
  });

  it('devuelve null cuando no hay split (destino y splits ausentes)', () => {
    const r = {
      destino: undefined, superficieTerreno: undefined, superficieConstruida: undefined,
      monto: '$50.000.000', montoRaw: '50000000', montoUf: 1000,
    };
    expect(valorUnitario(r)).toBeNull();
  });

  it('devuelve null cuando faltan monto y montoUf', () => {
    const r = {
      destino: 'W', superficieTerreno: 1000, superficieConstruida: undefined,
      monto: undefined, montoRaw: undefined, montoUf: undefined,
    };
    expect(valorUnitario(r)).toBeNull();
  });

  it('uf=null, clp=number cuando sólo hay monto CLP', () => {
    const r = {
      destino: 'W', superficieTerreno: 1000, superficieConstruida: undefined,
      monto: '$50.000.000', montoRaw: '50000000', montoUf: undefined,
    };
    const result = valorUnitario(r);
    expect(result!.uf).toBeNull();
    expect(result!.clp).toBe(50_000);
  });

  it('uf=number, clp=null cuando sólo hay montoUf', () => {
    const r = {
      destino: 'W', superficieTerreno: 1000, superficieConstruida: undefined,
      monto: undefined, montoRaw: undefined, montoUf: 1500,
    };
    const result = valorUnitario(r);
    expect(result!.uf).toBe(1.5);
    expect(result!.clp).toBeNull();
  });

  it('superficie 0 devuelve null (no divide por 0)', () => {
    const r = {
      destino: 'W', superficieTerreno: 0, superficieConstruida: undefined,
      monto: '$1.000.000', montoRaw: '1000000', montoUf: 30,
    };
    expect(valorUnitario(r)).toBeNull();
  });
});
