import type { Team, User } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

type TeamCardProps = {
  team: Team;
  members: User[];
};

export default function TeamCard({ team, members }: TeamCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
            <div className="p-2 bg-muted rounded-md">
                <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardDescription>Tu Equipo</CardDescription>
                <CardTitle>{team.name}</CardTitle>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Miembros del equipo:</p>
        <ul className="space-y-3">
          {members.map((member) => {
            const avatar = PlaceHolderImages.find(
              (img) => img.id === member.avatarId
            );
            return (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {avatar && (
                    <AvatarImage src={avatar.imageUrl} alt={member.name} />
                  )}
                  <AvatarFallback>
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{member.name}</span>
                {member.id === "user-1" && <Badge variant="outline">Tú</Badge>}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
