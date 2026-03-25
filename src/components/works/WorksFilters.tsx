import { memo } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorksFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  stimFilter: string;
  onStimFilterChange: (value: string) => void;
}

const WorksFilters = memo(({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  stimFilter,
  onStimFilterChange,
}: WorksFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Sök titel, upphovsperson, projekt..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Internt förlag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla typer</SelectItem>
          <SelectItem value="MSCE">MSCE</SelectItem>
          <SelectItem value="MSCP">MSCP</SelectItem>
          <SelectItem value="administration">Administration</SelectItem>
        </SelectContent>
      </Select>
      <Select value={stimFilter} onValueChange={onStimFilterChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="STIM-status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla status</SelectItem>
          <SelectItem value="anmäld">Anmäld</SelectItem>
          <SelectItem value="claimad">Claimad</SelectItem>
          <SelectItem value="ej_anmäld">Ej anmäld</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
});

WorksFilters.displayName = "WorksFilters";

export default WorksFilters;
