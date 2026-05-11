"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type InviteAcceptFormProps = {
  token: string;
  email: string;
  organizationName: string;
  organizationSlug: string;
};

export function InviteAcceptForm({
  token,
  email,
  organizationName,
  organizationSlug,
}: InviteAcceptFormProps) {
  const [state, action, isPending] = useActionState(acceptInviteAction, null);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />

      <Card className="bg-white border-slate-200">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inmobiliaria</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{organizationName}</p>
            <p className="text-[11px] text-slate-500">/{organizationSlug}</p>
          </div>
          
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email invitado</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{email}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-bold text-slate-700">
          Crea tu clave de acceso
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className="bg-white"
        />
        <p className="text-[11px] text-slate-400">
          Esta clave te permitirá ingresar a este y otros workspaces vinculados a tu email.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Activando cuenta...
          </>
        ) : (
          "Activar acceso"
        )}
      </Button>

      {state?.success === false && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 text-center">
          {state.message}
        </div>
      )}
    </form>
  );
}
