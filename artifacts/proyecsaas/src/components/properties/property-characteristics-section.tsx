'use client';

import { useEffect, useState } from 'react';

// ── Perfiles de campos por tipo de propiedad ─────────────────────────────────
// Cada tipo entra en un perfil y cada perfil muestra solo los campos que le
// corresponden. Asi un terreno no muestra baños/cocheras, un campo va en
// hectareas, un local no muestra dormitorios, etc.
type Profile = 'RESIDENCIAL' | 'COMERCIAL' | 'SUELO' | 'CAMPO' | 'ESPECIAL';

const PROFILE_BY_TYPE: Record<string, Profile> = {
  'Departamento': 'RESIDENCIAL',
  'Casa': 'RESIDENCIAL',
  'PH': 'RESIDENCIAL',
  'Quinta vacacional': 'RESIDENCIAL',
  'Hotel': 'RESIDENCIAL',
  'Edificio': 'RESIDENCIAL',
  'Desarrollo horizontal': 'RESIDENCIAL',
  'Desarrollo vertical': 'RESIDENCIAL',
  'Local comercial': 'COMERCIAL',
  'Oficina comercial': 'COMERCIAL',
  'Consultorio': 'COMERCIAL',
  'Fondo de comercio': 'COMERCIAL',
  'Bodega-Galpón': 'COMERCIAL',
  'Depósito': 'COMERCIAL',
  'Terreno': 'SUELO',
  'Campo': 'CAMPO',
  'Garage': 'ESPECIAL',
  'Bóveda, nicho o parcela': 'ESPECIAL',
  'Cama náutica': 'ESPECIAL',
};

function getProfile(propType: string): Profile {
  return PROFILE_BY_TYPE[propType] ?? 'RESIDENCIAL';
}

type Props = {
  initialPropertyType: string;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surfaceM2: number | null;
  coveredSurfaceM2: number | null;
  totalSurfaceM2: number | null;
  parkingSpots: number | null;
  yearBuilt: number | null;
  petsAllowed: boolean;
  professionalApt: boolean;
  creditApt: boolean;
  condition: string | null;
  services: string | null;
  inputClass: string;
  labelClass: string;
};

export function PropertyCharacteristicsSection({
  initialPropertyType,
  rooms,
  bedrooms,
  bathrooms,
  surfaceM2,
  coveredSurfaceM2,
  totalSurfaceM2,
  parkingSpots,
  yearBuilt,
  petsAllowed,
  professionalApt,
  creditApt,
  condition,
  services,
  inputClass,
  labelClass,
}: Props) {
  const [propType, setPropType] = useState(initialPropertyType || '');
  // Para CAMPO: el usuario carga hectareas; guardamos m² (1 ha = 10.000 m²).
  const [hectares, setHectares] = useState<string>(
    surfaceM2 != null ? String(surfaceM2 / 10000) : '',
  );

  useEffect(() => {
    const sel = document.getElementById('property-type-select') as HTMLSelectElement | null;
    if (!sel) return;
    setPropType(sel.value);
    const handler = () => setPropType(sel.value);
    sel.addEventListener('change', handler);
    return () => sel.removeEventListener('change', handler);
  }, []);

  const profile = getProfile(propType);
  const isResidencial = profile === 'RESIDENCIAL';
  const isComercial = profile === 'COMERCIAL';
  const isSuelo = profile === 'SUELO';
  const isCampo = profile === 'CAMPO';

  const showRoomsBeds = isResidencial; // ambientes/dormitorios
  const showBathrooms = isResidencial || isComercial;
  const showParking = isResidencial || isComercial;
  const showCovered = isResidencial || isComercial;
  const showYearCondition = isResidencial || isComercial;
  const showServices = isSuelo || isCampo;
  const showPets = isResidencial;
  const showProfessional = isComercial;

  return (
    <>
      <div className='grid gap-4 sm:grid-cols-3'>
        {showRoomsBeds && (
          <>
            <div>
              <label className={labelClass}>Ambientes</label>
              <input name='rooms' type='number' min='0' defaultValue={rooms ?? ''} className={inputClass} placeholder='Ej. 3' />
            </div>
            <div>
              <label className={labelClass}>Dormitorios</label>
              <input name='bedrooms' type='number' min='0' defaultValue={bedrooms ?? ''} className={inputClass} placeholder='Ej. 2' />
            </div>
          </>
        )}

        {showBathrooms && (
          <div>
            <label className={labelClass}>Baños</label>
            <input name='bathrooms' type='number' min='0' defaultValue={bathrooms ?? ''} className={inputClass} placeholder='Ej. 1' />
          </div>
        )}

        {/* Superficie */}
        {isCampo ? (
          <div>
            <label className={labelClass}>Superficie (hectáreas)</label>
            <input
              type='number'
              min='0'
              step='0.01'
              value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              className={inputClass}
              placeholder='Ej. 50'
            />
            <input
              type='hidden'
              name='surfaceM2'
              value={hectares ? String(Math.round(parseFloat(hectares) * 10000)) : ''}
            />
            <p className='mt-1 text-[10px] text-slate-400'>1 ha = 10.000 m²</p>
          </div>
        ) : (
          <div>
            <label className={labelClass}>Superficie (m²)</label>
            <input name='surfaceM2' type='number' min='0' defaultValue={surfaceM2 ?? ''} className={inputClass} placeholder='Ej. 65' />
          </div>
        )}

        {showCovered && (
          <div>
            <label className={labelClass}>Superficie Cubierta (m²)</label>
            <input name='coveredSurfaceM2' type='number' min='0' defaultValue={coveredSurfaceM2 ?? ''} className={inputClass} placeholder='Ej. 60' />
          </div>
        )}

        {/* Superficie total — para residencial/comercial/suelo (en campo va por hectareas) */}
        {!isCampo && (
          <div>
            <label className={labelClass}>{isSuelo ? 'Superficie Total del Lote (m²)' : 'Superficie Total (m²)'}</label>
            <input name='totalSurfaceM2' type='number' min='0' defaultValue={totalSurfaceM2 ?? ''} className={inputClass} placeholder='Ej. 65' />
          </div>
        )}

        {showParking && (
          <div>
            <label className={labelClass}>Cocheras</label>
            <input name='parkingSpots' type='number' min='0' defaultValue={parkingSpots ?? ''} className={inputClass} placeholder='Ej. 1' />
          </div>
        )}

        {showYearCondition && (
          <div>
            <label className={labelClass}>Año de Construcción</label>
            <input name='yearBuilt' type='number' min='1800' max='2100' defaultValue={yearBuilt ?? ''} className={inputClass} placeholder='Ej. 2015' />
          </div>
        )}

        {/* Servicios — terrenos y campos */}
        {showServices && (
          <div className='sm:col-span-3'>
            <label className={labelClass}>Servicios disponibles</label>
            <input name='services' type='text' defaultValue={services ?? ''} className={inputClass} placeholder='Ej. Agua, luz, gas natural, cloacas, asfalto' />
            <p className='mt-1 text-[10px] text-slate-400'>Separá con comas los servicios que llegan al lote.</p>
          </div>
        )}
      </div>

      <div className='mt-6 border-t border-slate-100 pt-6'>
        <h4 className='text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4'>
          Aptitudes y Condiciones
        </h4>
        <div className='grid gap-4 sm:grid-cols-3'>
          {showPets && (
            <label className='flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50'>
              <input name='petsAllowed' type='checkbox' defaultChecked={petsAllowed} className='mt-1 h-4 w-4 rounded border-slate-300 accent-brand-500' />
              <div>
                <span className='font-medium'>Admite Mascotas</span>
                <p className='text-xs text-slate-400 mt-0.5'>Permite animales domésticos en la propiedad.</p>
              </div>
            </label>
          )}

          {showProfessional && (
            <label className='flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50'>
              <input name='professionalApt' type='checkbox' defaultChecked={professionalApt} className='mt-1 h-4 w-4 rounded border-slate-300 accent-brand-500' />
              <div>
                <span className='font-medium'>Apto Profesional</span>
                <p className='text-xs text-slate-400 mt-0.5'>Habilitado para uso comercial u oficina.</p>
              </div>
            </label>
          )}

          {/* Apto Crédito — aplica a casi todo (compra con crédito) */}
          <label className='flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50'>
            <input name='creditApt' type='checkbox' defaultChecked={creditApt} className='mt-1 h-4 w-4 rounded border-slate-300 accent-brand-500' />
            <div>
              <span className='font-medium'>Apto Crédito</span>
              <p className='text-xs text-slate-400 mt-0.5'>Acepta compra mediante crédito hipotecario bancario.</p>
            </div>
          </label>
        </div>

        {showYearCondition && (
          <div className='mt-4'>
            <label className={labelClass}>Estado / Antigüedad</label>
            <select name='condition' defaultValue={condition ?? ''} className={inputClass}>
              <option value=''>Sin especificar</option>
              <option value='UNDER_CONSTRUCTION'>En construcción</option>
              <option value='NEW'>A estrenar</option>
              <option value='UP_TO_5_YEARS'>Hasta 5 años</option>
              <option value='GOOD'>Buen estado</option>
              <option value='OLD'>Antiguo</option>
            </select>
          </div>
        )}

        <p className='mt-4 text-xs text-slate-400 text-center bg-slate-50 rounded-xl p-3 border border-slate-100/60'>
          💡 Los campos se adaptan al tipo de propiedad. Completar estos datos robustece la ficha pública y optimiza las búsquedas del Agente IA en WhatsApp.
        </p>
      </div>
    </>
  );
}
