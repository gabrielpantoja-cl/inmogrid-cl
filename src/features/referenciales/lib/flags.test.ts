import { describe, it, expect } from '@jest/globals';
import { detectSuspicious } from './flags';

describe('detectSuspicious — monto', () => {
  it('flagea monto_zero cuando montoRaw es 0', () => {
    const result = detectSuspicious({ montoRaw: '0' });
    expect(result.flags).toContain('monto_zero');
  });

  it('flagea monto_zero cuando montoRaw es null', () => {
    const result = detectSuspicious({ montoRaw: null });
    expect(result.flags).toContain('monto_zero');
  });

  it('no flagea monto_zero con monto válido', () => {
    const result = detectSuspicious({ montoRaw: '50000000', destino: 'H', superficieTerreno: 200, superficieConstruida: 100 });
    expect(result.flags).not.toContain('monto_zero');
  });
});

describe('detectSuspicious — superficie por destino H (habitacional)', () => {
  it('flagea terreno >10.000 m² en H', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'H', superficieTerreno: 12000, superficieConstruida: 200,
    });
    expect(result.flags).toContain('superficie_terreno_alta');
  });

  it('flagea construida >2.000 m² en H', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'H', superficieTerreno: 500, superficieConstruida: 3500,
    });
    expect(result.flags).toContain('superficie_construida_alta');
  });

  it('no flagea casa típica 500/200 en H', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'H', superficieTerreno: 500, superficieConstruida: 200,
    });
    expect(result.flags).not.toContain('superficie_terreno_alta');
    expect(result.flags).not.toContain('superficie_construida_alta');
  });
});

describe('detectSuspicious — superficie por destino W (terreno)', () => {
  it('flagea terreno >100 ha en W', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'W', superficieTerreno: 2_000_000,
    });
    expect(result.flags).toContain('superficie_terreno_alta');
  });

  it('no flagea sitio eriazo razonable de 5.000 m² en W', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'W', superficieTerreno: 5_000,
    });
    expect(result.flags).not.toContain('superficie_terreno_alta');
  });
});

describe('detectSuspicious — superficie por destino A/B/F', () => {
  it('A: no flagea predio agrícola de 1.000 ha', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'A', superficieTerreno: 10_000_000,
    });
    expect(result.flags).not.toContain('superficie_terreno_alta');
  });

  it('A: flagea predio agrícola de 6.000 ha (>5.000)', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'A', superficieTerreno: 60_000_000,
    });
    expect(result.flags).toContain('superficie_terreno_alta');
  });

  it('F (forestal): flagea >1.000 ha', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'F', superficieTerreno: 11_000_000,
    });
    expect(result.flags).toContain('superficie_terreno_alta');
  });
});

describe('detectSuspicious — destinos horizontales (Z/L/O)', () => {
  it('Z: flagea construida <5 m² (data error)', () => {
    const result = detectSuspicious({
      montoRaw: '5000000', destino: 'Z', superficieConstruida: 2,
    });
    expect(result.flags).toContain('superficie_construida_baja');
  });

  it('L: flagea construida >1.000 m² (escala industrial inusual para bodega)', () => {
    const result = detectSuspicious({
      montoRaw: '5000000', destino: 'L', superficieConstruida: 1500,
    });
    expect(result.flags).toContain('superficie_construida_alta');
  });

  it('O: estacionamiento típico 12 m² no flagea', () => {
    const result = detectSuspicious({
      montoRaw: '8000000', destino: 'O', superficieConstruida: 80,
    });
    expect(result.flags).not.toContain('superficie_construida_alta');
    expect(result.flags).not.toContain('superficie_construida_baja');
  });
});

describe('detectSuspicious — destino C/I (comercial/industrial)', () => {
  it('C: flagea >5.000 m² construidos (mall scale)', () => {
    const result = detectSuspicious({
      montoRaw: '500000000', destino: 'C', superficieConstruida: 8000,
    });
    expect(result.flags).toContain('superficie_construida_alta');
  });

  it('I: flagea >50.000 m² construidos', () => {
    const result = detectSuspicious({
      montoRaw: '500000000', destino: 'I', superficieConstruida: 60_000,
    });
    expect(result.flags).toContain('superficie_construida_alta');
  });
});

describe('detectSuspicious — sin destino estructurado', () => {
  it('no flagea por superficie cuando destino es null (espera re-procesamiento upstream)', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: null,
    });
    expect(result.flags.filter((f) => f.startsWith('superficie_'))).toHaveLength(0);
  });

  it('destino V (otros) sin split: no flagea por superficie', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'V',
    });
    expect(result.flags.filter((f) => f.startsWith('superficie_'))).toHaveLength(0);
  });
});

describe('detectSuspicious — fecha y rol', () => {
  it('flagea fecha futura', () => {
    const result = detectSuspicious({ montoRaw: '100', fechaescritura: '01/01/3000' });
    expect(result.flags).toContain('fecha_invalid');
  });

  it('flagea rol con formato no estándar', () => {
    const result = detectSuspicious({ montoRaw: '100', rol: 'ABC-123' });
    expect(result.flags).toContain('rol_invalid');
  });

  it('rol vacío no flagea (ausencia ≠ formato inválido)', () => {
    const result = detectSuspicious({ montoRaw: '100', rol: null });
    expect(result.flags).not.toContain('rol_invalid');
  });
});

describe('detectSuspicious — niveles', () => {
  it('0 flags → none', () => {
    const result = detectSuspicious({
      montoRaw: '100000000', destino: 'H', superficieTerreno: 200, superficieConstruida: 100,
    });
    expect(result.level).toBe('none');
  });

  it('1 flag → low', () => {
    const result = detectSuspicious({ montoRaw: '0', destino: 'H', superficieTerreno: 200, superficieConstruida: 100 });
    expect(result.level).toBe('low');
  });

  it('3+ flags → high', () => {
    const result = detectSuspicious({
      montoRaw: '0',
      destino: 'H', superficieTerreno: 50000, superficieConstruida: 5000,
      rol: 'invalid',
    });
    expect(result.level).toBe('high');
  });
});
