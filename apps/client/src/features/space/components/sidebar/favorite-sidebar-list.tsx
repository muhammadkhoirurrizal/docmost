import { Group, Text, UnstyledButton, Box } from "@mantine/core";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFavoritesQuery } from "@/features/favorite/queries/favorite-query";
import { PageListIcon } from "@/components/common/page-list-icon";
import { buildPageUrl, getPageTitle } from "@/features/page/page.utils";
import classes from "./space-sidebar.module.css";
import clsx from "clsx";
import { useLocation } from "react-router-dom";

export function FavoriteSidebarList({ spaceId, spaceSlug }: { spaceId: string, spaceSlug: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { data } = useFavoritesQuery("page", spaceId);

  const favorites = data?.pages.flatMap((p) => p.items) ?? [];

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className={clsx(classes.section, classes.sectionPages)} style={{ paddingBottom: '16px' }}>
      <Group className={classes.pagesHeader} justify="space-between">
        <Text size="xs" fw={500} c="dimmed">
          {t("Favorites")}
        </Text>
      </Group>

      <div className={classes.pages}>
        {favorites.map((fav) => {
          if (!fav.page) return null;
          
          const isActive = location.pathname.toLowerCase() === buildPageUrl(spaceSlug, fav.page.slugId, fav.page.title).toLowerCase();

          return (
            <UnstyledButton
              key={fav.id}
              component={Link}
              to={buildPageUrl(spaceSlug, fav.page.slugId, fav.page.title)}
              className={clsx(classes.pageLink, isActive ? classes.activeButton : "")}
              style={{ display: "flex", alignItems: "center" }}
            >
              <Box style={{ marginRight: 8, display: "flex", alignItems: "center" }}>
                <PageListIcon icon={fav.page.icon} isBase={fav.page.isBase} />
              </Box>
              <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                {getPageTitle(fav.page.title, fav.page.isBase, t)}
              </Text>
            </UnstyledButton>
          );
        })}
      </div>
    </div>
  );
}
