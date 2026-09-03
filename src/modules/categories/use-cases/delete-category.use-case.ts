import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { categoryRepository } from "../repositories/category.repository.js";

type CategoryRepository = typeof categoryRepository;

type DeleteCategoryInput = {
  categoryId: string;
  userId: string;
};

export const makeDeleteCategoryUseCase = (repository: CategoryRepository) => {
  return async ({ categoryId, userId }: DeleteCategoryInput) => {
    const category = await repository.findById(categoryId);

    if (!category) {
      throw makeAppError({
        code: "CATEGORY_NOT_FOUND",
        message: "Categoria não encontrada",
        statusCode: 404,
      });
    }

    if (category.userId !== userId) {
      throw makeAppError({
        code: "CATEGORY_ACCESS_DENIED",
        message: "Você não tem permissão para excluir esta categoria",
        statusCode: 403,
      });
    }

    if (category.isSystem) {
      throw makeAppError({
        code: "CATEGORY_SYSTEM_IMMUTABLE",
        message: "Categorias do sistema não podem ser excluídas",
        statusCode: 403,
      });
    }

    await repository.softDelete(categoryId);
  };
};
