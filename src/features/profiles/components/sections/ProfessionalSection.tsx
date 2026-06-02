import { useMemo } from 'react';
import { FormSection, TextField, SelectField } from '../FormSection';
import {
  PROFESSION_OPTIONS,
  REGIONES,
  getComunasByRegion,
} from '../../lib/constants';
import type { ProfileFormData } from '../../types';

interface Props {
  formData: ProfileFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
}

const REGION_OPTIONS = [
  { value: '', label: 'Selecciona una región' },
  ...REGIONES.map((r) => ({ value: r, label: r })),
];

export function ProfessionalSection({ formData, onChange }: Props) {
  // Comunas filtradas por la región seleccionada. Si no hay región el
  // dropdown queda deshabilitado con un mensaje claro — evitamos que el
  // user tipee una comuna inexistente o mal escrita (typo-proof UI).
  const comunaOptions = useMemo(() => {
    const comunas = getComunasByRegion(formData.region);
    if (comunas.length === 0) {
      return [{ value: '', label: 'Selecciona primero una región' }];
    }
    return [
      { value: '', label: 'Selecciona una comuna' },
      ...comunas.map((c) => ({ value: c, label: c })),
    ];
  }, [formData.region]);

  const comunaDisabled = !formData.region;

  return (
    <>
      <FormSection title="Información profesional">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            id="profession"
            name="profession"
            label="Profesión"
            value={formData.profession}
            onChange={onChange}
            options={PROFESSION_OPTIONS}
          />
          <TextField
            id="company"
            name="company"
            label="Empresa u organización"
            value={formData.company}
            onChange={onChange}
            maxLength={100}
            placeholder="Ej: Inmogrid SpA"
          />
        </div>
      </FormSection>

      <FormSection title="Contacto y ubicación">
        <p className="-mt-3 mb-4 text-xs text-gray-500">
          Cualquier campo que dejes vacío no aparecerá en tu perfil público.
          Tú decides qué compartir.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            id="phone"
            name="phone"
            label="Teléfono"
            type="tel"
            value={formData.phone}
            onChange={onChange}
            maxLength={20}
            placeholder="+56 9 1234 5678 (opcional)"
          />
          <TextField
            id="contactEmail"
            name="contactEmail"
            label="Email de contacto"
            type="email"
            value={formData.contactEmail}
            onChange={onChange}
            maxLength={150}
            placeholder="contacto@miempresa.cl (opcional)"
            hint="Distinto del email con el que inicias sesión."
          />
          <SelectField
            id="region"
            name="region"
            label="Región"
            value={formData.region}
            onChange={onChange}
            options={REGION_OPTIONS}
          />
          <SelectField
            id="commune"
            name="commune"
            label="Comuna"
            value={formData.commune}
            onChange={onChange}
            options={comunaOptions}
            disabled={comunaDisabled}
            hint={
              comunaDisabled
                ? 'Selecciona primero una región para ver las comunas disponibles.'
                : undefined
            }
          />
          <div className="md:col-span-2">
            <TextField
              id="address"
              name="address"
              label="Dirección de oficina"
              value={formData.address}
              onChange={onChange}
              maxLength={200}
              placeholder="Av. Apoquindo 4501, oficina 502 (opcional)"
            />
          </div>
        </div>
      </FormSection>
    </>
  );
}
