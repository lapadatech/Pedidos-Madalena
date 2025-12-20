import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import { cn } from '@/lib/utils';
import TagChip from '@/shared/components/tags/TagChip';
import { listarTags } from '@/lib/tagsApi';
import { useToast } from '@/shared/ui/use-toast';

function TagSelector({ selectedTagIds = [], onChange, className }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const loadTags = async () => {
      try {
        const data = await listarTags();
        if (mounted) {
          setTags(data || []);
        }
      } catch (error) {
        if (mounted) {
          console.error('Erro ao carregar tags:', error);
          toast({
            title: 'Erro ao carregar tags',
            description: 'Não foi possível carregar a lista de tags.',
            variant: 'destructive',
          });
        }
      }
    };
    loadTags();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleSelect = (tagId) => {
    // Ensure we are working with arrays
    const currentSelected = Array.isArray(selectedTagIds) ? selectedTagIds : [];

    const isSelected = currentSelected.includes(tagId);
    let newSelection;

    if (isSelected) {
      newSelection = currentSelected.filter((id) => id !== tagId);
    } else {
      newSelection = [...currentSelected, tagId];
    }

    onChange(newSelection);
  };

  // Safe filter
  const selectedTags = tags.filter(
    (tag) => Array.isArray(selectedTagIds) && selectedTagIds.includes(tag.id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-auto min-h-[42px] p-2 bg-white', className)}
        >
          <div className="flex gap-1.5 flex-wrap items-center w-full">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <TagChip
                  key={tag.id}
                  nome={tag.nome}
                  cor={tag.cor}
                  onRemove={() => handleSelect(tag.id)}
                />
              ))
            ) : (
              <span className="text-muted-foreground text-sm pl-1">Selecione tags...</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar tag..." />
          <CommandList>
            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {tags.map((tag) => {
                const isSelected = Array.isArray(selectedTagIds) && selectedTagIds.includes(tag.id);
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.nome}
                    onSelect={() => handleSelect(tag.id)}
                    className="cursor-pointer !pointer-events-auto"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary/50',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <TagChip nome={tag.nome} cor={tag.cor} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default TagSelector;
