# Monkey patch for Django 4.2.29 + Python 3.14: BaseContext.__copy__ can call copy(super())
# which fails because super() object has no __copy__ implementation.
# This patch avoids crash in admin change list rendering.

from django.template import context as django_context
from copy import copy


def _patch_django_context_copy():
    BaseContext = getattr(django_context, "BaseContext", None)
    if BaseContext is None:
        return

    def patched_copy(self):
        # Fallback for Python 3.14 + Django 4.2.29 context.copy().
        # Keep subclass fields (template/render_context etc.) while cloning the dict stack safely.
        duplicate = self.__class__.__new__(self.__class__)
        if hasattr(self, "__dict__"):
            duplicate.__dict__.update(self.__dict__)

        duplicate.dicts = getattr(self, "dicts", []).copy()
        return duplicate

    BaseContext.__copy__ = patched_copy


_patch_django_context_copy()
