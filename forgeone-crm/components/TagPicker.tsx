import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Input } from "./Input";
import { Badge } from "./Badge";
import { Search } from "lucide-react";
import {
  TAG_CATEGORIES,
  getTagsByCategory,
  TagDefinition,
} from "../helpers/templateTagRegistry";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./Accordion";
import styles from "./TagPicker.module.css";

interface TagPickerProps {
  onInsert: (tagKey: string) => void;
  trigger: React.ReactNode;
}

export const TagPicker: React.FC<TagPickerProps> = ({ onInsert, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const result: { category: string; tags: TagDefinition[] }[] = [];

    TAG_CATEGORIES.forEach((category) => {
      const tags = getTagsByCategory(category).filter(
        (tag) =>
          tag.label.toLowerCase().includes(term) ||
          tag.key.toLowerCase().includes(term),
      );
      if (tags.length > 0) {
        result.push({ category, tags });
      }
    });

    return result;
  }, [searchTerm]);

  const handleSelect = (key: string) => {
    onInsert(key);
    setIsOpen(false);
    setSearchTerm("");
  };

  const activeCategories = filteredCategories.map((c) => c.category);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={styles.popoverContent} align="start">
        <div className={styles.header}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <Input
              type="search"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              autoFocus
            />
          </div>
        </div>

        <div className={styles.contentArea}>
          {filteredCategories.length === 0 ? (
            <div className={styles.emptyState}>No tags found.</div>
          ) : (
            <Accordion
              type="multiple"
              value={searchTerm ? activeCategories : []}
              className={styles.accordion}
            >
              {filteredCategories.map(({ category, tags }) => (
                <AccordionItem
                  key={category}
                  value={category}
                  className={styles.accordionItem}
                >
                  <AccordionTrigger className={styles.accordionTrigger}>
                    {category}
                  </AccordionTrigger>
                  <AccordionContent className={styles.accordionContent}>
                    <div className={styles.tagList}>
                      {tags.map((tag) => (
                        <button
                          key={tag.key}
                          type="button"
                          className={styles.tagItem}
                          onClick={() => handleSelect(tag.key)}
                        >
                          <div className={styles.tagItemHeader}>
                            <span className={styles.tagLabel}>{tag.label}</span>
                            {tag.format && tag.format !== "text" && (
                              <Badge variant="secondary" className={styles.tagBadge}>
                                {tag.format}
                              </Badge>
                            )}
                          </div>
                          <span className={styles.tagKey}>{`{{${tag.key}}}`}</span>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};