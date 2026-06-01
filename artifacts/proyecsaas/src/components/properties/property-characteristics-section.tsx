'use client';

import { useEffect, useState } from 'react';

// Tipos que ocultan ambientes/dorm/banos/mascotas
const NON_RESIDENTIAL = new Set([
  'Terreno', 'Campo', 'Garage', 'Boveda, nicho o parcela', 'Cama nautica',
  'Bóveda, nicho o parcela', 'Cama náutica',
  'Bodega-Galpon', 'Bodega-Galpón', 'Deposito', 'Depósito',
  'Local comercial', 'Oficina comercial', 'Consultorio', 'Fondo de comercio',
]);

// Tipos que son puro suelo (ocultan ademas sup cubierta, año, estado)
const LAND = new Set([
  'Terreno', 'Campo',
  'Boveda, nicho o parcela', 'Bóveda, nicho o parcela',
  'Cama nautica', 'Cama náutica',
]);

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
  inputClass,
  labelClass,
}: Props) {
  const [propType, setPropType] = useState(initialPropertyType || '');

  useEffect(() => {
    // Leer el select de tipo de propiedad del formulario del Server Component
    const sel = document.getElementById('property-type-select') as HTMLSelectElement | null;
    if (!sel) return;
    setPropType(sel.value);
    const handler = () => setPropType(sel.value);
    sel.addEventListener('change', handler);
    return () => sel.removeEventListener('change', handler);
  }, []);

  const isLand = LAND.has(propType);
  const isNonResidential = NON_RESIDENTIAL.has(propType);

  const surfaceLabel = isLand
    ? 'Superficie (m²) — 1 ha = 10.000 m²'
    : 'Superficie (m²)';
  const totalLabel = isLand
    ? 'Superficie Total del Lote (m²)'
    : 'Superficie Total (m²)';

  return (
    <>
      <div className='grid gap-4 sm:grid-cols-3'>
        {/* Ambientes — solo residencial */}
        {!isNonResidential && (
          <div>
            <label className={labelClass}>Ambientes</label>
            <input
              name='rooms'
              type='number'
              min='0'
              defaultValue={rooms ?? ''}
              className={inputClass}
              placeholder='Ej. 3'
            />
          </div>
        )}

        {/* Dormitorios — solo residencial */}
        {!isNonResidential && (
          <div>
            <label className={labelClass}>Dormitorios</label>
            <input
              name='bedrooms'
              type='number'
              min='0'
              defaultValue={bedrooms ?? ''}
              className={inputClass}
              placeholder='Ej. 2'
            />
          </div>
        )}

        {/* Baños — solo residencial */}
        {!isNonResidential && (
          <div>
            <label className={labelClass}>Baños</label>
            <input
              name='bathrooms'
              type='number'
              min='0'
              defaultValue={bathrooms ?? ''}
              className={inputClass}
              placeholder='Ej. 1'
            />
          </div>
        )}

        {/* Superficie — siempre, label cambia */}
        <div>
          <label className={labelClass}>{surfaceLabel}</label>
          <input
            name='surfaceM2'
            type='number'
            min='0'
            defaultValue={surfaceM2 ?? ''}
            className={inputClass}
            placeholder='Ej. 65'
          />
        </div>

        {/* Superficie Cubierta — no aplica para terrenos/campos */}
        {!isLand && (
          <div>
            <label className={labelClass}>Superficie Cubierta (m²)</label>
            <input
              name='coveredSurfaceM2'
              type='number'
              min='0'
              defaultValue={coveredSurfaceM2 ?? ''}
              className={inputClass}
              placeholder='Ej. 60'
            />
          </div>
        )}

        {/* Superficie Total — siempre, label cambia */}
        <div>
          <label className={labelClass}>{totalLabel}</label>
          <input
            name='totalSurfaceM2'
            type='number'
            min='0'
            defaultValue={totalSurfaceM2 ?? ''}
            className={inputClass}
            placeholder='Ej. 65'
          />
        </div>

        {/* Cocheras — siempre visible */}
        <div>
          <label className={labelClass}>Cocheras</label>
          <input
            name='parkingSpots'
            type='number'
            min='0'
            defaultValue={parkingSpots ?? ''}
            className={inputClass}
            placeholder='Ej. 1'
          />
        </div>

        {/* Año de Construcción — no aplica para terrenos/campos */}
        {!isLand && (
          <div>
            <label className={labelClass}>Año de Construcción</label>
            <input
              name='yearBuilt'
              type='number'
              min='1800'
              max='2100'
              defaultValue={yearBuilt ?? ''}
              className={inputClass}
              placeholder='Ej. 2015'
            />
          </div>
        )}
      </div>

      <div className='mt-6 border-t border-slate-100 pt-6'>
        <h4 className='text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4'>
          Aptitudes y Condiciones
        </h4>
        <div className='grid gap-4 sm:grid-cols-3'>
          {/* Admite Mascotas — solo residencial */}
          {!isNonResidential && (
            <label className='flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50'>
              <input
                name='petsAllowed'
                type='checkbox'
                defaultChecked={petsAllowed}
                className='mt-1 h-4 w-4 rounded border-slate-300 accent-brand-500'
              />
              <div>
                <span className='font-medium'>Admite Mascotas</span>
                <p className='text-xs text-slate-400 mt-0.5'>
                  Permite animales domésticos en la propiedad.
                </p>
              </div>
            </label>
          )}

          {/* Apto Profesional — siempre */}
          <label className='flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50'>
            <input
              name='professionalApt'
              type='checkbox'
              defaultChecked={professionalApt}
              className='mt-1 h-4 w-4 rounded border-slate-300 accent-brand-500'
            />
            <div>
              <span className='font-medium'>Apto Profesional</span>
              <p className='text-xs text-slate-400 mt-0.5'>
                Habilitado para uso comercial u oficina.
              </p>
            </div>
          </label>

          {/* Apto Crédito — siempre */}
          <label className='flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50'>
            <input
              name='creditApt'
              type='checkbox'
              defaultChecked={creditApt}
              className='mt-1 h-4 w-4 rounded border-slate-300 accent-brand-500'
            />
            <div>
              <span className='font-medium'>Apto Crédito</span>
              <p className='text-xs text-slate-400 mt-0.5'>
                Acepta compra mediante crédito hipotecario bancario.
              </p>
            </div>
          </label>
        </div>

        {/* Estado / Antigüedad — no aplica para terrenos/campos */}
        {!isLand && (
          <div className='mt-4'>
            <label className={labelClass}>Estado / Antigüedad</label>
            <select
              name='condition'
              defaultValue={condition ?? ''}
              className={inputClass}
            >
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
          💡 Completar estos datos físicos y geográficos robustece la ficha pública, optimiza las búsquedas inteligentes del Agente IA en WhatsApp y garantiza una correcta categorización de cara al futuro mapa interactivo.
        </p>
      </div>
    </>
  );
}
