import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { OrgInvitations } from '../../../helpers/schema';

export const schema = z.object({});

export type InvitationWithInviter = Selectable<OrgInvitations> & {
  invitedByName: string | null;
};

export type OutputType = {
  invitations: InvitationWithInviter[];
};

export const getOrgInvitationsList = async (
init?: RequestInit)
: Promise<OutputType> => {
  const result = await fetch(`/_api/org/invitations/list`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!result.ok) {
    const errorObject = superjson.parse<{error: string;}>(await result.text());
    throw new Error(errorObject.error);
  }

  return superjson.parse<OutputType>(await result.text());
};