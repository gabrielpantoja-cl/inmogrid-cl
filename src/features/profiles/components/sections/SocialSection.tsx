import { FormSection, TextField } from '../FormSection';
import type { ProfileFormData } from '../../types';

interface Props {
  formData: ProfileFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
}

/**
 * Sección de redes del formulario de perfil.
 *
 * La sección "Privacidad" que antes convivía acá (con toggle de
 * visibilidad y URL preview) se consolidó en `ProfileUrlBanner` — un solo
 * punto de control para la URL pública y el switch público/privado.
 */
export function SocialSection({ formData, onChange }: Props) {
  return (
    <FormSection title="Redes y sitio web">
      <div className="space-y-4">
        <TextField
          id="website"
          name="website"
          label="Sitio web"
          type="url"
          value={formData.website}
          onChange={onChange}
          placeholder="https://ejemplo.cl"
        />
        <TextField
          id="linkedin"
          name="linkedin"
          label="LinkedIn"
          type="url"
          value={formData.linkedin}
          onChange={onChange}
          placeholder="https://linkedin.com/in/tu-perfil"
        />
      </div>
    </FormSection>
  );
}
