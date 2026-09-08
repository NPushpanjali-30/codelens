"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div>
      <Topbar title="Settings" description="Profile, connected accounts, and danger zone" />

      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Card>
          <CardHeader terminal title="Profile" />
          <CardBody className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <Button size="sm" loading={saving} onClick={() => setSaving(true)}>
              Save changes
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader terminal title="Connected accounts" />
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github className="h-4 w-4 text-text-muted" />
                <div>
                  <p className="text-sm">GitHub</p>
                  <p className="text-xs text-text-muted">Grants read access to repository contents</p>
                </div>
              </div>
              <Badge tone="neutral">Not connected</Badge>
            </div>
          </CardBody>
        </Card>

        <Card className="border-danger/30">
          <CardHeader terminal title="Danger zone" />
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Delete account</p>
                <p className="text-xs text-text-muted">
                  Permanently removes your profile, repositories, and chat history.
                </p>
              </div>
              <Button size="sm" variant="danger">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
