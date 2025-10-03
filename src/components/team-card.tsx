import type { Team, User } from "@/lib/data";
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
  currentUserId: string;
};

export default function TeamCard({ team, members, currentUserId }: TeamCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
            <div className="p-2 bg-muted rounded-md">
                <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardDescription>Your Team</CardDescription>
                <CardTitle>{team.name}</CardTitle>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Team members:</p>
        <ul className="space-y-3">
          {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                    <AvatarFallback>
                        {member.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                </Avatar>
                <span className="font-medium">{member.name}</span>
                {member.id === currentUserId && <Badge variant="outline">You</Badge>}
              </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
